require("dotenv").config({ path: ".env.local" });
const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractId, 
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");

async function approveContract() {
    console.log("=== Approving Contract for LYNX Token Spending ===");
    
    // Log environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
    
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || 
        !process.env.LYNX_CONTRACT_ADDRESS || 
        !process.env.LYNX_TOKEN_ID) {
        throw new Error("Required environment variables are not set");
    }
    
    // Prompt for private key
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        // Get operator key from user input
        const operatorKey = await new Promise(resolve => {
            readline.question('Enter your private key (ED25519): ', key => {
                console.log('Key received (not displayed for security)');
                resolve(key);
            });
        });
        
        // Create Hedera client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const privateKey = PrivateKey.fromStringED25519(operatorKey);
        const client = Client.forTestnet().setOperator(operatorId, privateKey);
        
        // Set up contract details
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const lynxTokenId = AccountId.fromString(process.env.LYNX_TOKEN_ID);
        
        // Amount to approve (1,000,000 tokens with 8 decimals)
        const approveAmount = "100000000000000"; // 1M tokens with 8 decimals
        
        console.log(`Approving ${contractId.toString()} to spend ${approveAmount} LYNX tokens from ${operatorId.toString()}`);
        
        // Call the ERC20 approve function
        const approveTransaction = new ContractExecuteTransaction()
            .setContractId(lynxTokenId)
            .setGas(1000000)
            .setFunction("approve", 
                new ContractFunctionParameters()
                    .addAddress(contractId.toSolidityAddress())  // spender (contract)
                    .addUint256(approveAmount)                  // amount
            )
            .setMaxTransactionFee(new Hbar(2));
        
        const approveSubmit = await approveTransaction.execute(client);
        const approveReceipt = await approveSubmit.getReceipt(client);
        
        console.log(`Approval transaction status: ${approveReceipt.status.toString()}`);
        
    } catch (error) {
        console.error("Error approving contract:", error);
    } finally {
        readline.close();
    }
    
    console.log("=== Approval Process Complete ===");
}

approveContract()
    .then(() => console.log("Script execution completed."))
    .catch(error => console.error("Script execution failed:", error)); 