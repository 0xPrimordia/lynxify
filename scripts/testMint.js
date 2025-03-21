const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar,
    AccountId,
    TokenId,
    PrivateKey,
    AccountAllowanceApproveTransaction,
    ContractCallQuery
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function testMint() {
    try {
        console.log("=== Mint Test Started ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || 
            !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Convert token IDs
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
        const contractId = AccountId.fromString(process.env.LYNX_CONTRACT_ADDRESS);

        console.log("\n=== Step 1: Approving SAUCE and CLXY token spending ===");
        // First approve the contract to spend tokens
        const mintAmount = 10; // Mint 10 LYNX tokens

        // Get token ratios from contract to know how much to approve
        console.log("\n=== Getting Token Ratios from Contract ===");
        const ratioQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getTokenRatios")
            .setQueryPayment(new Hbar(0.5));
            
        const ratioResult = await ratioQuery.execute(client);
        const ratioDecodedResult = ratioResult.getInt32(0);
        console.log("SAUCE to LYNX ratio:", ratioDecodedResult);
        
        const sauceAmount = mintAmount * ratioDecodedResult;
        console.log(`Approving ${sauceAmount} SAUCE tokens for mint of ${mintAmount} LYNX`);

        const clxyRatioQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getTokenRatios", new ContractFunctionParameters().addUint8(1))
            .setQueryPayment(new Hbar(0.5));
            
        const clxyRatioResult = await clxyRatioQuery.execute(client);
        const clxyRatioDecodedResult = clxyRatioResult.getInt32(0);
        console.log("CLXY to LYNX ratio:", clxyRatioDecodedResult);
        
        const clxyAmount = mintAmount * clxyRatioDecodedResult;
        console.log(`Approving ${clxyAmount} CLXY tokens for mint of ${mintAmount} LYNX`);

        // Approve SAUCE tokens
        console.log("\n=== Approving SAUCE tokens ===");
        const sauceApproveTransaction = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(sauceTokenId, operatorId, contractId, sauceAmount)
            .freezeWith(client)
            .sign(operatorKey);
        
        const sauceApproveSubmit = await sauceApproveTransaction.execute(client);
        const sauceApproveReceipt = await sauceApproveSubmit.getReceipt(client);
        console.log("SAUCE approval status:", sauceApproveReceipt.status.toString());

        // Approve CLXY tokens
        console.log("\n=== Approving CLXY tokens ===");
        const clxyApproveTransaction = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(clxyTokenId, operatorId, contractId, clxyAmount)
            .freezeWith(client)
            .sign(operatorKey);
        
        const clxyApproveSubmit = await clxyApproveTransaction.execute(client);
        const clxyApproveReceipt = await clxyApproveSubmit.getReceipt(client);
        console.log("CLXY approval status:", clxyApproveReceipt.status.toString());

        // Now execute the mint
        console.log("\n=== Executing mint transaction ===");
        console.log(`Minting ${mintAmount} LYNX tokens`);
        
        const mintTransaction = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters().addUint256(mintAmount)
            )
            .freezeWith(client)
            .sign(operatorKey);

        const mintSubmit = await mintTransaction.execute(client);
        console.log("Transaction ID:", mintSubmit.transactionId.toString());
        
        const mintReceipt = await mintSubmit.getReceipt(client);
        console.log("Mint status:", mintReceipt.status.toString());
        
        console.log("\n=== Mint Test Completed Successfully ===");
        
    } catch (error) {
        console.error("Error in mint test:", error);
        
        if (error.message) {
            console.error("Error message:", error.message);
        }
        
        if (error.transactionId) {
            console.error("Transaction ID of failed transaction:", error.transactionId.toString());
        }
        
        if (error.status) {
            console.error("Transaction status:", error.status.toString());
        }
    }
}

// Run the function and ensure the script exits
testMint()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 