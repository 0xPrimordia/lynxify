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

async function setContractLynxToken() {
    console.log("Starting LYNX token ID update process...");
    
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

    // Get contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    
    console.log(`Updating LYNX token ID in contract ${contractId} to ${lynxTokenId}`);

    try {
        // Convert the token ID to a proper Solidity address format
        // The format needs to be 0xABCDEF... without any additional formatting
        const tokenIdNum = parseInt(lynxTokenId.toString().split('.')[2]);
        if (isNaN(tokenIdNum) || tokenIdNum === 0) {
            throw new Error(`Invalid token ID: ${lynxTokenId}`);
        }
        
        // Create a properly formatted address with 0x prefix and correct padding
        const hexString = tokenIdNum.toString(16);
        const paddedHex = hexString.padStart(40, '0');
        const lynxTokenSolidityAddress = `0x${paddedHex}`;
        
        console.log(`LYNX Token ID: ${lynxTokenId}`);
        console.log(`LYNX Token ID (decimal): ${tokenIdNum}`);
        console.log(`LYNX Token Solidity Address: ${lynxTokenSolidityAddress}`);
        
        // Validate the address isn't zero
        if (lynxTokenSolidityAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Token address would be zero address - cannot proceed');
        }
        
        // Set the LYNX token ID
        console.log("\n=== Setting LYNX Token ID ===");
        const updateTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("setLynxTokenId", new ContractFunctionParameters().addAddress(lynxTokenSolidityAddress))
            .setMaxTransactionFee(new Hbar(10));
            
        console.log("Executing transaction to set the LYNX token ID...");
        const updateSubmit = await updateTx.execute(client);
        const updateRx = await updateSubmit.getReceipt(client);
        console.log("Set LYNX token ID result:", updateRx.status.toString());
        
        // Verify the change by checking the supply key status
        console.log("\n=== Verifying LYNX Token Setup ===");
        const checkSupplyKeyTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("checkSupplyKey")
            .setMaxTransactionFee(new Hbar(5));
        
        const checkSupplyKeySubmit = await checkSupplyKeyTx.execute(client);
        const checkSupplyKeyRx = await checkSupplyKeySubmit.getReceipt(client);
        console.log("Check supply key result:", checkSupplyKeyRx.status.toString());
        
        return "LYNX token ID successfully set in contract";
    } catch (error) {
        console.error("Error setting LYNX token ID:", error.message);
        throw error;
    }
}

setContractLynxToken()
    .then((result) => {
        console.log(`\n${result}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Operation failed:", error);
        process.exit(1);
    }); 