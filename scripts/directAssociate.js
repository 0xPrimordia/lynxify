const {
    Client,
    ContractId,
    TokenAssociateTransaction,
    TokenId,
    PrivateKey,
    AccountId,
    Hbar
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function directAssociateTokens() {
    try {
        // Log relevant environment variables
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || 
            !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const client = Client.forTestnet();
        client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

        // Get token IDs
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
        const lynxTokenId = process.env.LYNX_TOKEN_ID ? TokenId.fromString(process.env.LYNX_TOKEN_ID) : null;

        // Get contract account ID
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        
        // Log what we're going to associate
        console.log("Preparing to associate tokens with contract:", contractId.toString());
        console.log("SAUCE Token ID:", sauceTokenId.toString());
        console.log("CLXY Token ID:", clxyTokenId.toString());
        if (lynxTokenId) {
            console.log("LYNX Token ID:", lynxTokenId.toString());
        }

        // Create token list to associate
        const tokenIds = [sauceTokenId, clxyTokenId];
        if (lynxTokenId) {
            tokenIds.push(lynxTokenId);
        }

        // Create and execute the association transaction
        console.log("Creating TokenAssociateTransaction...");
        const transaction = await new TokenAssociateTransaction()
            .setAccountId(AccountId.fromString(process.env.LYNX_CONTRACT_ADDRESS))
            .setTokenIds(tokenIds)
            .setMaxTransactionFee(new Hbar(50))
            .freezeWith(client);
            
        console.log("Executing TokenAssociateTransaction...");
        const response = await transaction.execute(client);
        
        console.log("Getting receipt...");
        const receipt = await response.getReceipt(client);
        
        console.log("Token association status:", receipt.status.toString());
        
        if (receipt.status.toString() === "SUCCESS") {
            console.log("Successfully associated tokens with the contract!");
        } else {
            console.error("Failed to associate tokens with the contract. Status:", receipt.status.toString());
        }

        console.log("Direct association process completed.");
    } catch (error) {
        console.error("Error in directAssociateTokens function:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    }
}

// Run the function and ensure the script exits
directAssociateTokens()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 