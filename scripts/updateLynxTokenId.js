require('dotenv').config({ path: './.env.local' });
const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractExecuteTransaction,
    TokenId,
    ContractFunctionParameters,
    Hbar
} = require("@hashgraph/sdk");

async function updateLynxTokenId() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    
    console.log(`Updating LYNX token ID in contract ${contractId} to ${lynxTokenId}`);

    try {
        // Zero out the LYNX token first by calling a special method
        console.log("\n=== Forcing LYNX Token Address to Zero ===");
        // This transaction will fail for normal contracts but we're using it to show the approach
        
        // Instead, we need to ensure the contract is set to allow the token ID change
        console.log("\n=== Setting Supply Key Status to True ===");
        const setSupplyKeyTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(500000)
            .setFunction("setSupplyKeyStatus", new ContractFunctionParameters().addBool(true))
            .setMaxTransactionFee(new Hbar(5));
        
        const setSupplyKeySubmit = await setSupplyKeyTx.execute(client);
        const setSupplyKeyRx = await setSupplyKeySubmit.getReceipt(client);
        console.log("Set supply key status result:", setSupplyKeyRx.status.toString());
        
        // Convert the token ID to a Solidity address
        // The format is 0.0.XXXXX -> 0x00...XXXXX (in hex, padded to 40 chars)
        function tokenIdToSolidityAddress(tokenId) {
            const parts = tokenId.toString().split('.');
            const num = parseInt(parts[2]);
            const hex = num.toString(16).padStart(40, '0');
            return `0x${hex}`;
        }
        
        const lynxTokenSolidityAddress = tokenIdToSolidityAddress(lynxTokenId);
        console.log(`LYNX Token Solidity Address: ${lynxTokenSolidityAddress}`);
        
        // Now, update the LYNX token ID
        console.log("\n=== Setting LYNX Token ID ===");
        const rawFunctionParam = Buffer.from(lynxTokenSolidityAddress.slice(2), 'hex'); // Remove 0x prefix
        
        const updateTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("setLynxTokenId", new ContractFunctionParameters().addAddress(lynxTokenSolidityAddress))
            .setMaxTransactionFee(new Hbar(10));
            
        console.log("Executing transaction to set the LYNX token ID...");
        const updateSubmit = await updateTx.execute(client);
        const updateRx = await updateSubmit.getReceipt(client);
        console.log("Set LYNX token ID result:", updateRx.status.toString());
        
        // Then verify that the change was successful
        console.log("\n=== Checking Supply Key Status After Update ===");
        const updateSupplyKeyTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("checkSupplyKey")
            .setMaxTransactionFee(new Hbar(5));
        
        const updateSupplyKeySubmit = await updateSupplyKeyTx.execute(client);
        const updateSupplyKeyRx = await updateSupplyKeySubmit.getReceipt(client);
        console.log("Check supply key status result:", updateSupplyKeyRx.status.toString());
        
        return "LYNX token ID updated successfully";
    } catch (error) {
        console.error("Error updating LYNX token ID:", error.message);
        throw error;
    }
}

updateLynxTokenId()
    .then((result) => {
        console.log(`\n${result}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Update failed:", error);
        process.exit(1);
    }); 