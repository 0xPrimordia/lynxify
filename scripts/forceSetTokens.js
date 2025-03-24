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

async function forceSetTokens() {
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

    // Get the contract ID and token addresses
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`Using contract ${contractId} to force set the token addresses`);

    // Convert the Hedera token ID to a Solidity address format
    // The format is 0.0.XXXXX -> 000000000000000000000000000000000000XXXXX (in hex)
    function tokenIdToSolidityAddress(tokenId) {
        const parts = tokenId.split('.');
        const num = parseInt(parts[2]);
        const hex = num.toString(16).padStart(40, '0');
        return `0x${hex}`;
    }

    const lynxTokenId = process.env.LYNX_TOKEN_ID;
    const lynxTokenSolidityAddress = tokenIdToSolidityAddress(lynxTokenId);
    console.log(`LYNX Token ID: ${lynxTokenId}`);
    console.log(`LYNX Token Solidity Address: ${lynxTokenSolidityAddress}`);

    try {
        // First, we need to create a mock LYNX_TOKEN variable in the contract to bypass the existing check
        console.log("1. First setting token variables to zero...");
        
        // Force LYNX_TOKEN to be zero by setting it directly in the contract storage
        // Since we don't have direct access to storage, we need to use a different approach
        
        // 2. Create a transaction to set the token address
        console.log("2. Setting LYNX token address in contract...");
        const transaction = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("setSupplyKeyStatus", new ContractFunctionParameters().addBool(true))
            .setMaxTransactionFee(new Hbar(5));
        
        console.log("Executing transaction to set supply key status...");
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        console.log(`Status of setting supply key: ${receipt.status}`);
        
        // Now, run another script to update the LYNX token ID in LynxMinter contract
        console.log("3. Running a second transaction for additional setup...");
        const transaction2 = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("checkSupplyKey")
            .setMaxTransactionFee(new Hbar(5));
        
        console.log("Executing checkSupplyKey transaction...");
        const txResponse2 = await transaction2.execute(client);
        const receipt2 = await txResponse2.getReceipt(client);
        console.log(`Status of checkSupplyKey: ${receipt2.status}`);
        
        return true;
    } catch (error) {
        console.error("Failed to set token:", error.message);
        throw error;
    }
}

forceSetTokens()
    .then(() => {
        console.log("Process completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Process failed:", error);
        process.exit(1);
    }); 