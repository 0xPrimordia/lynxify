const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar,
    AccountId,
    PrivateKey,
    TokenId,
    AccountAllowanceApproveTransaction
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function mintTest() {
    try {
        console.log("=== Simple Mint Test ===");
        
        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Contract & token IDs
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
        
        console.log("Contract:", contractId.toString());
        console.log("Operator:", operatorId.toString());
        console.log("LYNX:", lynxTokenId.toString());
        console.log("SAUCE:", sauceTokenId.toString());
        console.log("CLXY:", clxyTokenId.toString());

        // Approve token allowances for a very small amount (0.1 LYNX)
        const lynxAmount = 1; // Just 1 token
        const sauceAmount = 5; // 5 SAUCE per LYNX
        const clxyAmount = 2;  // 2 CLXY per LYNX
        
        console.log("\n1. Approving token allowances...");
        
        // Approve LYNX (treasury -> contract)
        console.log("- Approving LYNX tokens...");
        const lynxApprove = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(lynxTokenId, operatorId, contractId, lynxAmount * 10) // More than needed
            .execute(client);
            
        const lynxApproveRx = await lynxApprove.getReceipt(client);
        console.log("  LYNX approval status:", lynxApproveRx.status.toString());
        
        // Approve SAUCE (user -> contract)
        console.log("- Approving SAUCE tokens...");
        const sauceApprove = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(sauceTokenId, operatorId, contractId, sauceAmount)
            .execute(client);
            
        const sauceApproveRx = await sauceApprove.getReceipt(client);
        console.log("  SAUCE approval status:", sauceApproveRx.status.toString());
        
        // Approve CLXY (user -> contract)
        console.log("- Approving CLXY tokens...");
        const clxyApprove = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(clxyTokenId, operatorId, contractId, clxyAmount)
            .execute(client);
            
        const clxyApproveRx = await clxyApprove.getReceipt(client);
        console.log("  CLXY approval status:", clxyApproveRx.status.toString());
        
        // Execute mint transaction
        console.log("\n2. Executing mint transaction...");
        const hbarRequired = lynxAmount * 10; // 10 tinybar per LYNX
        console.log(`- Minting ${lynxAmount} LYNX with ${hbarRequired} tinybar...`);
        
        const mintTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters().addUint256(lynxAmount)
            )
            .setPayableAmount(new Hbar(hbarRequired / 100000000)) // Convert tinybar to HBAR
            .execute(client);
        
        try {
            const mintRx = await mintTx.getReceipt(client);
            console.log("- Mint status:", mintRx.status.toString());
            console.log("Mint successful!");
        } catch (receiptError) {
            console.error("- Mint failed:", receiptError.message);
            
            try {
                // Try to get transaction record for more details
                const record = await mintTx.getRecord(client);
                if (record && record.contractFunctionResult && record.contractFunctionResult.errorMessage) {
                    console.error("- Error reason:", record.contractFunctionResult.errorMessage);
                }
            } catch (recordError) {
                console.error("- Could not get transaction record:", recordError.message);
            }
        }
        
    } catch (error) {
        console.error("Error during mint test:", error.message);
    }
}

mintTest()
    .then(() => console.log("Test completed."))
    .catch(error => console.error("Test failed:", error)); 