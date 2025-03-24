const { 
    Client, 
    AccountId, 
    PrivateKey,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    Hbar,
    ContractId
} = require("@hashgraph/sdk");
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './.env.local' });

async function createLynxToken() {
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
    console.log(`Using contract ID for supply key: ${contractId}`);

    // Create the LYNX token with contract as supply key
    console.log("Creating LYNX token...");
    const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName("LYNX Token")
        .setTokenSymbol("LYNX")
        .setDecimals(8)
        .setInitialSupply(0) // Start with zero supply
        .setTreasuryAccountId(operatorId) // Treasury starts as operator
        .setAdminKey(operatorKey) // Admin key for management
        .setSupplyKey(contractId) // Contract has supply key
        .setTokenMemo("LYNX token for Lynxify platform")
        .setSupplyType(TokenSupplyType.Infinite)
        .setTokenType(TokenType.FungibleCommon)
        .setMaxTransactionFee(new Hbar(30));
    
    const tokenCreateSubmit = await tokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const lynxTokenId = tokenCreateRx.tokenId;
    
    console.log(`LYNX token created with ID: ${lynxTokenId}`);

    // Update .env.local file with the LYNX token ID
    const envPath = path.join(process.cwd(), '.env.local');
    try {
        let envContent = await fs.readFile(envPath, 'utf8');
        
        // Add or update LYNX token ID
        if (envContent.includes('LYNX_TOKEN_ID=')) {
            envContent = envContent.replace(/LYNX_TOKEN_ID=.*/, `LYNX_TOKEN_ID=${lynxTokenId}`);
        } else {
            envContent += `\nLYNX_TOKEN_ID=${lynxTokenId}`;
        }
        
        // Also add public version
        if (envContent.includes('NEXT_PUBLIC_LYNX_TOKEN_ID=')) {
            envContent = envContent.replace(/NEXT_PUBLIC_LYNX_TOKEN_ID=.*/, `NEXT_PUBLIC_LYNX_TOKEN_ID=${lynxTokenId}`);
        } else {
            envContent += `\nNEXT_PUBLIC_LYNX_TOKEN_ID=${lynxTokenId}`;
        }
        
        await fs.writeFile(envPath, envContent);
        console.log('Updated .env.local with new LYNX token ID');
    } catch (error) {
        console.error('Failed to update .env.local:', error);
    }

    return lynxTokenId;
}

createLynxToken()
    .then((tokenId) => {
        console.log("Token creation completed successfully!");
        console.log(`LYNX Token ID: ${tokenId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Token creation failed:", error);
        process.exit(1);
    }); 