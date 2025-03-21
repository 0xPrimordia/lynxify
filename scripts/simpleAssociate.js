const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    AccountId,
    PrivateKey,
    Hbar
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function simpleAssociate() {
    try {
        console.log("=== Simple Token Association ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        
        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Contract ID
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        
        console.log("\n=== Associating tokens with contract ===");
        
        // Call the associateTokens function in the contract
        const associateTransaction = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("associateTokens")
            .setMaxTransactionFee(new Hbar(5));
            
        const associateResponse = await associateTransaction.execute(client);
        const associateReceipt = await associateResponse.getReceipt(client);
        
        console.log("Association status:", associateReceipt.status.toString());
        
        console.log("\n=== Token Association Complete ===");
    } catch (error) {
        console.error("Error in token association:", error);
        console.error("Error message:", error.message);
    }
}

// Run the function
simpleAssociate()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script execution failed:", error);
        process.exit(1);
    }); 