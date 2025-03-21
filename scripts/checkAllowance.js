require("dotenv").config({ path: ".env.local" });
const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractId, 
    ContractCallQuery,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");

async function checkAllowance() {
    console.log("=== Checking LYNX Token Allowance ===");
    
    // Log environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("NEXT_PUBLIC_OPERATOR_KEY:", process.env.NEXT_PUBLIC_OPERATOR_KEY ? "[REDACTED]" : "Not set");
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
    
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.NEXT_PUBLIC_OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error("Required environment variables are not set");
    }
    
    // Create Hedera client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.NEXT_PUBLIC_OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    
    // Set up contract details
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = AccountId.fromString(process.env.LYNX_TOKEN_ID);
    
    try {
        // Use the ERC20 allowance function to check how many tokens the contract can spend
        console.log("Checking allowance...");
        
        // Convert the contract address to solidity format
        const contractAddress = contractId.toSolidityAddress();
        
        // Call the ERC20 allowance function
        const allowanceQuery = new ContractCallQuery()
            .setContractId(lynxTokenId)
            .setGas(100000)
            .setFunction("allowance", 
                new ContractFunctionParameters()
                    .addAddress(operatorId.toSolidityAddress())  // owner (treasury)
                    .addAddress(contractAddress)                // spender (contract)
            )
            .setQueryPayment(Hbar.fromTinybars(100000000));
        
        const allowanceResult = await allowanceQuery.execute(client);
        
        // Decode and log the result
        const allowance = allowanceResult.getUint256(0);
        console.log(`Allowance: ${allowance.toString()}`);
        
    } catch (error) {
        console.error("Error checking allowance:", error);
    }
    
    console.log("=== Allowance Check Complete ===");
}

checkAllowance()
    .then(() => console.log("Script execution completed."))
    .catch(error => console.error("Script execution failed:", error)); 