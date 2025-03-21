const {
    Client,
    TokenInfoQuery,
    TokenId
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkLynxToken() {
    try {
        console.log("Starting LYNX token check...");
        
        // Log relevant environment variables
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_TOKEN_ID) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const client = Client.forTestnet();
        client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

        // Get the LYNX token ID
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        
        console.log("LYNX Token ID:", lynxTokenId.toString());
        
        // Check token info with SDK
        console.log("Checking LYNX token properties with SDK...");
        
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(lynxTokenId)
            .execute(client);
            
        console.log("SDK Token Info:");
        console.log("- Name:", tokenInfo.name);
        console.log("- Symbol:", tokenInfo.symbol);
        console.log("- Decimals:", tokenInfo.decimals);
        console.log("- Supply:", tokenInfo.totalSupply.toString());
        console.log("- Treasury Account:", tokenInfo.treasuryAccountId?.toString());
        
        // Output key information
        console.log("Key Information:");
        console.log("- Supply Key:", tokenInfo.supplyKey ? "Present" : "None");
        console.log("- Admin Key:", tokenInfo.adminKey ? "Present" : "None");
        console.log("- KYC Key:", tokenInfo.kycKey ? "Present" : "None");
        console.log("- Freeze Key:", tokenInfo.freezeKey ? "Present" : "None");
        console.log("- Wipe Key:", tokenInfo.wipeKey ? "Present" : "None");
        console.log("- Pause Key:", tokenInfo.pauseKey ? "Present" : "None");

        // Check which account has control over the token keys
        console.log("\nChecking token ownership on Mirror Node...");
        
        // Use mirror node to get more detailed token info
        const response = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/tokens/${process.env.LYNX_TOKEN_ID}`
        );
        
        if (!response.ok) {
            console.error("Error fetching token info from mirror node:", response.statusText);
            return;
        }
        
        const tokenData = await response.json();
        console.log("Mirror Node Token Info:");
        console.log(JSON.stringify(tokenData, null, 2));
        
        // Check if the key is in ED25519 or ECDSA format
        if (tokenData.supply_key && tokenData.supply_key.key) {
            console.log("\nSupply Key Details:");
            const supplyKey = tokenData.supply_key.key;
            console.log("Supply Key:", supplyKey);
            
            // Check if the key might be an account ID
            if (supplyKey.match(/^0\.0\.\d+$/)) {
                console.log("Supply key appears to be an account ID");
            } 
            // Check if the key might be a contract ID
            else if (supplyKey.match(/^0\.0\.\d+$/)) {
                console.log("Supply key appears to be a contract ID");
            }
            // Otherwise assume it's a public key
            else {
                console.log("Supply key appears to be a public key");
                
                // If it's a public key, and we have the admin private key in the environment
                if (process.env.ADMIN_PRIVATE_KEY) {
                    console.log("ADMIN_PRIVATE_KEY is available in environment variables");
                }
            }
        }
        
        console.log("\nLYNX token check completed.");
    } catch (error) {
        console.error("Error in checkLynxToken function:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    }
}

// Run the function and ensure the script exits
checkLynxToken()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 