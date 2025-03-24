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

async function updateContractTokenId() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, LYNX_TOKEN_ID');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get the contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = AccountId.fromString(process.env.LYNX_TOKEN_ID);
    
    console.log(`Updating contract ${contractId} with LYNX token ID ${lynxTokenId}`);
    console.log(`LYNX token address: ${lynxTokenId.toSolidityAddress()}`);

    // Call setLynxTokenId function
    try {
        const updateTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(500000)
            .setFunction("setLynxTokenId", 
                new ContractFunctionParameters().addAddress(lynxTokenId.toSolidityAddress())
            )
            .setMaxTransactionFee(new Hbar(5));
        
        console.log("Executing transaction...");
        const updateSubmit = await updateTx.execute(client);
        const updateRx = await updateSubmit.getReceipt(client);
        
        console.log(`Contract update status: ${updateRx.status}`);
        console.log("Contract successfully updated with new LYNX token ID");
        
        return updateRx.status;
    } catch (error) {
        console.error("Failed to update contract with LYNX token ID:", error.message);
        throw error;
    }
}

updateContractTokenId()
    .then(() => {
        console.log("Contract update completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Contract update failed:", error);
        process.exit(1);
    }); 