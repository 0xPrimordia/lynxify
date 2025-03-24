const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");

async function updateContractTokenId() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, LYNX_TOKEN_ID');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get the contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = AccountId.fromString(process.env.LYNX_TOKEN_ID);
    
    console.log(`Updating contract ${contractId} with LYNX token ID ${lynxTokenId}`);

    // Call setLynxTokenId function if it exists
    try {
        const updateTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("setLynxTokenId", 
                new ContractFunctionParameters().addAddress(lynxTokenId.toSolidityAddress())
            )
            .setMaxTransactionFee(new Hbar(2));
        
        const updateSubmit = await updateTx.execute(client);
        const updateRx = await updateSubmit.getReceipt(client);
        
        console.log(`Contract update status: ${updateRx.status}`);
        console.log("Contract successfully updated with new LYNX token ID");
    } catch (error) {
        console.error("Failed to update contract with LYNX token ID:", error.message);
        console.error("Make sure the contract has a 'setLynxTokenId' function");
        
        // If the contract doesn't have a setLynxTokenId function, you would need to redeploy it
        console.log("\nWARNING: You may need to modify your contract to include a 'setLynxTokenId' function");
        console.log("or redeploy the contract entirely with the correct LYNX token ID.");
    }
}

updateContractTokenId()
    .then(() => {
        console.log("Process completed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Process failed:", error);
        process.exit(1);
    });
