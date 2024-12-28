import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

async function main() {
    if (!process.env.OPERATOR_ID || !process.env.NEXT_PUBLIC_NFT_TOKEN_ID) {
        throw new Error("Environment variables must be present");
    }

    try {
        console.log('Checking NFTs for:', {
            tokenId: process.env.NEXT_PUBLIC_NFT_TOKEN_ID,
            treasury: process.env.NEXT_PUBLIC_OPERATOR_ID
        });

        const response = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/tokens/${process.env.NEXT_PUBLIC_NFT_TOKEN_ID}/nfts?account.id=${process.env.OPERATOR_ID}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Available NFTs:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error checking NFTs:', error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 