const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar,
    AccountId,
    PrivateKey,
    TokenId,
    AccountAllowanceApproveTransaction,
    TokenAssociateTransaction
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function finalTest() {
    try {
        console.log("=== Final Minter Test ===");
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

        // Convert IDs
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);

        console.log("\n=== Step 1: Associate the contract with tokens ===");
        console.log("Note: This may fail if already done, which is okay.");
        
        try {
            // Create a transaction to associate the contract with all three tokens
            const tokenAssociateTransaction = new TokenAssociateTransaction()
                .setAccountId(contractId)
                .setTokenIds([lynxTokenId, sauceTokenId, clxyTokenId]);
                
            const associateResponse = await tokenAssociateTransaction.execute(client);
            const associateReceipt = await associateResponse.getReceipt(client);
            console.log("Token association status:", associateReceipt.status.toString());
        } catch (error) {
            console.error("Token association failed (may already be associated):", error.message);
        }

        console.log("\n=== Step 2: Approve token allowances ===");
        
        // Amount to mint (just 1 LYNX for testing)
        const mintAmount = 1;
        
        // Get ratios from contract state
        const sauceRatio = 5;  // From contract state
        const clxyRatio = 2;   // From contract state
        
        const sauceAmount = mintAmount * sauceRatio;
        const clxyAmount = mintAmount * clxyRatio;
        
        console.log(`Approving ${sauceAmount} SAUCE for mint of ${mintAmount} LYNX`);
        console.log(`Approving ${clxyAmount} CLXY for mint of ${mintAmount} LYNX`);
        
        // Approve SAUCE tokens
        console.log("\nApproving SAUCE tokens...");
        try {
            const sauceApproveTransaction = new AccountAllowanceApproveTransaction()
                .approveTokenAllowance(sauceTokenId, operatorId, contractId, sauceAmount);
            
            const sauceApproveSubmit = await sauceApproveTransaction.execute(client);
            const sauceApproveReceipt = await sauceApproveSubmit.getReceipt(client);
            console.log("SAUCE approval status:", sauceApproveReceipt.status.toString());
        } catch (error) {
            console.error("SAUCE approval failed:", error.message);
        }

        // Approve CLXY tokens
        console.log("\nApproving CLXY tokens...");
        try {
            const clxyApproveTransaction = new AccountAllowanceApproveTransaction()
                .approveTokenAllowance(clxyTokenId, operatorId, contractId, clxyAmount);
            
            const clxyApproveSubmit = await clxyApproveTransaction.execute(client);
            const clxyApproveReceipt = await clxyApproveSubmit.getReceipt(client);
            console.log("CLXY approval status:", clxyApproveReceipt.status.toString());
        } catch (error) {
            console.error("CLXY approval failed:", error.message);
        }

        // Approve LYNX tokens for treasury (contract to spend)
        console.log("\nApproving LYNX tokens for treasury...");
        try {
            const lynxApproveTransaction = new AccountAllowanceApproveTransaction()
                .approveTokenAllowance(lynxTokenId, operatorId, contractId, mintAmount * 10); // Approve more than needed
            
            const lynxApproveSubmit = await lynxApproveTransaction.execute(client);
            const lynxApproveReceipt = await lynxApproveSubmit.getReceipt(client);
            console.log("LYNX approval status:", lynxApproveReceipt.status.toString());
        } catch (error) {
            console.error("LYNX approval failed:", error.message);
        }

        // Now execute the mint
        console.log("\n=== Step 3: Executing mint transaction ===");
        console.log(`Minting ${mintAmount} LYNX token`);
        
        // Calculate required HBAR amount
        const hbarRatio = 10; // From contract state
        const hbarRequired = mintAmount * hbarRatio;
        console.log(`Sending ${hbarRequired} tinybar (${hbarRatio} per LYNX)`);
        
        try {
            const mintTransaction = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(1000000)
                .setFunction(
                    "mint",
                    new ContractFunctionParameters().addUint256(mintAmount)
                )
                .setPayableAmount(new Hbar(hbarRequired / 100000000)); // Convert from tinybar to HBAR
                
            const mintSubmit = await mintTransaction.execute(client);
            console.log("Transaction ID:", mintSubmit.transactionId.toString());
            
            try {
                const mintReceipt = await mintSubmit.getReceipt(client);
                console.log("Mint status:", mintReceipt.status.toString());
                console.log("\n=== Mint Test Completed Successfully ===");
            } catch (error) {
                console.error("Error getting mint receipt:", error.message);
                
                // Try to get the record which might contain more details
                try {
                    const record = await mintSubmit.getRecord(client);
                    console.log("Transaction executed but failed. Status:", record.receipt.status.toString());
                    if (record.contractFunctionResult) {
                        const errorMessage = `Contract revert reason: ${record.contractFunctionResult.errorMessage}`;
                        console.error(errorMessage);
                    }
                } catch (recordError) {
                    console.error("Could not get record:", recordError.message);
                }
            }
        } catch (error) {
            console.error("Mint transaction failed:", error.message);
        }
    } catch (error) {
        console.error("Error in final test:", error);
        console.error("Error message:", error.message);
    }
}

// Run the function
finalTest()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script execution failed:", error);
        process.exit(1);
    }); 