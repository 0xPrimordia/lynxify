const {
    Client,
    ContractId,
    ContractCallQuery,
    AccountId,
    PrivateKey,
    Hbar
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkDebug() {
    try {
        console.log("=== Contract Debug Info ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Convert contract ID
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);

        console.log("\n=== Getting Token Addresses ===");
        
        const addressesQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getTokenAddresses")
            .setQueryPayment(new Hbar(0.1));
            
        const addressesResult = await addressesQuery.execute(client);
        
        const lynxToken = addressesResult.getAddress(0);
        const sauceToken = addressesResult.getAddress(1);
        const clxyToken = addressesResult.getAddress(2);
        const treasuryAccount = addressesResult.getAddress(3);
        
        console.log("LYNX Token Address:", lynxToken);
        console.log("SAUCE Token Address:", sauceToken);
        console.log("CLXY Token Address:", clxyToken);
        console.log("Treasury Account:", treasuryAccount);
        
        console.log("\n=== Getting Debug Info ===");
        
        const debugQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getDebugInfo")
            .setQueryPayment(new Hbar(0.1));
            
        const debugResult = await debugQuery.execute(client);
        
        const treasuryLynxBalance = debugResult.getUint256(0);
        const treasuryLynxAllowance = debugResult.getUint256(1);
        const hbarRatio = debugResult.getUint256(2);
        const sauceRatio = debugResult.getUint256(3);
        const clxyRatio = debugResult.getUint256(4);
        
        console.log("Treasury LYNX Balance:", treasuryLynxBalance.toString());
        console.log("Treasury LYNX Allowance for Contract:", treasuryLynxAllowance.toString());
        console.log("HBAR Ratio:", hbarRatio.toString());
        console.log("SAUCE Ratio:", sauceRatio.toString());
        console.log("CLXY Ratio:", clxyRatio.toString());
        
        console.log("\n=== Debug Check Complete ===");
    } catch (error) {
        console.error("Error checking debug info:", error);
        console.error("Error message:", error.message);
    }
}

// Run the function
checkDebug()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script execution failed:", error);
        process.exit(1);
    }); 