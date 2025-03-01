const dotenvConfig = require('dotenv');
const { LynxTokenCreator } = require('../src/token/lynxToken');

dotenvConfig.config({ path: '.env.local' });

async function deployLynxToken() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
        throw new Error('Missing environment variables');
    }

    const creator = new LynxTokenCreator(
        "testnet",
        process.env.NEXT_PUBLIC_OPERATOR_ID,
        process.env.OPERATOR_KEY
    );

    try {
        const tokenId = await creator.createToken();
        console.log(`LYNX token created successfully. Token ID: ${tokenId}`);
        return tokenId;
    } catch (error) {
        console.error('Failed to deploy LYNX token:', error);
        process.exit(1);
    }
}

deployLynxToken(); 