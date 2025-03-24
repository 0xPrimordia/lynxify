const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

async function createTokenUsingContract() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get the contract ID
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`Using contract ${contractId} to create LYNX token`);

    // Call createLynxToken function on the contract
    try {
        const createTokenTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000) // Higher gas limit for token creation
            .setFunction("createLynxToken", 
                new ContractFunctionParameters()
                    .addString("LYNX Token")
                    .addString("LYNX")
                    .addString("LYNX token for Lynxify platform on testnet")
            )
            .setMaxTransactionFee(new Hbar(20));
        
        console.log("Executing transaction to create LYNX token through contract...");
        const createTokenSubmit = await createTokenTx.execute(client);
        const createTokenRx = await createTokenSubmit.getReceipt(client);
        
        console.log(`Token creation status: ${createTokenRx.status}`);
        console.log("Token successfully created through the contract");
        
        // After token creation, we should check what the token ID is
        console.log("Note: You'll need to query the contract to get the LYNX token ID");
        console.log("Please run a script to check the contract's LYNX_TOKEN value");
        
        return createTokenRx.status;
    } catch (error) {
        console.error("Failed to create token through contract:", error.message);
        throw error;
    }
}

createTokenUsingContract()
    .then(() => {
        console.log("Process completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Process failed:", error);
        process.exit(1);
    }); 