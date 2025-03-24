const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractCreateFlow,
    Hbar,
    FileCreateTransaction,
    FileAppendTransaction
} = require("@hashgraph/sdk");
const fs = require('fs').promises;
require('dotenv').config({ path: './.env.local' });

async function redeployMinter() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, SAUCE_TOKEN_ID, CLXY_TOKEN_ID, LYNX_TOKEN_ID');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Convert the Hedera token ID to a Solidity address format
    function tokenIdToSolidityAddress(tokenId) {
        const parts = tokenId.split('.');
        const num = parseInt(parts[2]);
        const hex = num.toString(16).padStart(40, '0');
        return `0x${hex}`;
    }

    // Get token addresses
    const lynxTokenId = process.env.LYNX_TOKEN_ID;
    const sauceTokenId = process.env.SAUCE_TOKEN_ID;
    const clxyTokenId = process.env.CLXY_TOKEN_ID;
    
    const lynxTokenSolidityAddress = tokenIdToSolidityAddress(lynxTokenId);
    const sauceTokenSolidityAddress = tokenIdToSolidityAddress(sauceTokenId);
    const clxyTokenSolidityAddress = tokenIdToSolidityAddress(clxyTokenId);
    
    console.log(`LYNX Token ID: ${lynxTokenId} -> Address: ${lynxTokenSolidityAddress}`);
    console.log(`SAUCE Token ID: ${sauceTokenId} -> Address: ${sauceTokenSolidityAddress}`);
    console.log(`CLXY Token ID: ${clxyTokenId} -> Address: ${clxyTokenSolidityAddress}`);

    try {
        // Read the bytecode
        const bytecode = await fs.readFile('./artifacts/src/app/contracts/LynxMinter.sol/LynxMinter.json', 'utf8');
        const contractJson = JSON.parse(bytecode);
        
        // Create constructor parameter string
        // The format is: <function selector><param1 padded><param2 padded><param3 padded>
        // For addresses, we pad to 32 bytes (64 hex chars) each
        const constructorParams = 
            lynxTokenSolidityAddress.slice(2).padStart(64, '0') +
            sauceTokenSolidityAddress.slice(2).padStart(64, '0') +
            clxyTokenSolidityAddress.slice(2).padStart(64, '0');
        
        console.log("Constructor params:", constructorParams);
        
        // Use ContractCreateFlow which is easier to use
        console.log("Deploying contract with existing token addresses...");
        const contractCreateFlow = new ContractCreateFlow()
            .setGas(1000000)
            .setBytecode(contractJson.bytecode + constructorParams)
            .setMaxTransactionFee(new Hbar(20));
            
        const contractCreateSubmit = await contractCreateFlow.execute(client);
        const contractCreateRx = await contractCreateSubmit.getReceipt(client);
        const contractId = contractCreateRx.contractId;
        console.log(`Contract deployed with ID: ${contractId}`);
        
        // Update the .env.local file with the new contract ID
        const envFile = await fs.readFile('.env.local', 'utf8');
        const updatedEnv = envFile
            .replace(/^LYNX_CONTRACT_ADDRESS=.*$/m, `LYNX_CONTRACT_ADDRESS=${contractId}`)
            .replace(/^NEXT_PUBLIC_LYNX_CONTRACT_ADDRESS=.*$/m, `NEXT_PUBLIC_LYNX_CONTRACT_ADDRESS=${contractId}`);
        
        if (updatedEnv !== envFile) {
            await fs.writeFile('.env.local', updatedEnv);
            console.log('.env.local updated with new contract address');
        }
        
        // Convert the contract ID to EVM address format manually
        const evmAddress = `0x` + contractId.toString().split('.')[2].padStart(40, '0');
        console.log(`Contract EVM address: ${evmAddress}`);
        
        return contractId.toString();
    } catch (error) {
        console.error("Failed to deploy contract:", error.message);
        throw error;
    }
}

redeployMinter()
    .then((contractId) => {
        console.log(`Contract redeployment completed with ID: ${contractId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Process failed:", error);
        process.exit(1);
    }); 