const { 
    Client: TestTokenClient,
    TokenCreateTransaction: TestTokenCreate,
    AccountId: TestAccountId,
    PrivateKey: TestPrivateKey,
    Hbar: TestHbar,
    TokenType: TestTokenType,
    TokenSupplyType: TestTokenSupplyType
} = require("@hashgraph/sdk");
const testFs = require('fs').promises;
const testPath = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

async function deployTestTokens() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY');
    }

    console.log("Using operator ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);

    const client = TestTokenClient.forTestnet();
    client.setOperator(
        TestAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID),
        TestPrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    // Create SAUCE test token
    const sauceCreateTx = await new TestTokenCreate()
        .setTokenName("Test SAUCE")
        .setTokenSymbol("tSAUCE")
        .setDecimals(8)
        .setInitialSupply(100000000000000) // 1,000,000 tokens with 8 decimals
        .setTreasuryAccountId(TestAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID))
        .setAdminKey(TestPrivateKey.fromString(process.env.OPERATOR_KEY))
        .setSupplyKey(TestPrivateKey.fromString(process.env.OPERATOR_KEY))
        .setTokenType(TestTokenType.FungibleCommon)
        .setSupplyType(TestTokenSupplyType.Infinite)
        .setMaxTransactionFee(new TestHbar(30))
        .execute(client);

    const sauceReceipt = await sauceCreateTx.getReceipt(client);
    const sauceTokenId = sauceReceipt.tokenId;
    console.log(`Test SAUCE token created with ID: ${sauceTokenId}`);

    // Create CLXY test token
    const clxyCreateTx = await new TestTokenCreate()
        .setTokenName("Test CLXY")
        .setTokenSymbol("tCLXY")
        .setDecimals(8)
        .setInitialSupply(100000000000000) // 1,000,000 tokens with 8 decimals
        .setTreasuryAccountId(TestAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID))
        .setAdminKey(TestPrivateKey.fromString(process.env.OPERATOR_KEY))
        .setSupplyKey(TestPrivateKey.fromString(process.env.OPERATOR_KEY))
        .setTokenType(TestTokenType.FungibleCommon)
        .setSupplyType(TestTokenSupplyType.Infinite)
        .setMaxTransactionFee(new TestHbar(30))
        .execute(client);

    const clxyReceipt = await clxyCreateTx.getReceipt(client);
    const clxyTokenId = clxyReceipt.tokenId;
    console.log(`Test CLXY token created with ID: ${clxyTokenId}`);

    // Update .env.local file with test token IDs
    const envPath = testPath.join(process.cwd(), '.env.local');
    try {
        let envContent = await testFs.readFile(envPath, 'utf8');
        
        // Replace or add the token IDs
        envContent = envContent.replace(
            /SAUCE_TOKEN_ID=.*/,
            `SAUCE_TOKEN_ID=${sauceTokenId}`
        );
        envContent = envContent.replace(
            /CLXY_TOKEN_ID=.*/,
            `CLXY_TOKEN_ID=${clxyTokenId}`
        );

        // If the variables don't exist, add them
        if (!envContent.includes('SAUCE_TOKEN_ID=')) {
            envContent += `\nSAUCE_TOKEN_ID=${sauceTokenId}`;
        }
        if (!envContent.includes('CLXY_TOKEN_ID=')) {
            envContent += `\nCLXY_TOKEN_ID=${clxyTokenId}`;
        }

        await testFs.writeFile(envPath, envContent);
        console.log('Updated .env.local with new token IDs');
    } catch (error) {
        console.error('Failed to update .env.local:', error);
    }

    return {
        sauceTokenId,
        clxyTokenId
    };
}

deployTestTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 