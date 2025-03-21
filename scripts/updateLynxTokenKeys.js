const {
    Client,
    TokenUpdateTransaction,
    TokenId,
    PrivateKey,
    PublicKey,
    AccountId,
    ContractId
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function updateLynxTokenKeys() {
    try {
        console.log("Starting LYNX token key update process...");
        
        // Log relevant environment variables
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
            !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const client = Client.forTestnet();
        client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

        // Get the current operator key
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
        
        // Get the LYNX token ID
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        
        // Get the contract ID
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        
        console.log("LYNX Token ID:", lynxTokenId.toString());
        console.log("Contract ID:", contractId.toString());
        
        // Check current token info before updating
        await checkLynxTokenProperties();
        
        // Create contract key
        console.log("Creating contract key for LYNX token supply key...");
        // In Hedera, a ContractId can be used as a key for token operations
        // This will allow the contract to mint LYNX tokens
        
        console.log("Updating LYNX token supply key to contract...");
        const updateTx = new TokenUpdateTransaction()
            .setTokenId(lynxTokenId)
            .setSupplyKey(contractId)
            .freezeWith(client);
            
        // Sign the transaction with the current supply key (which is the operator key)
        const signedTx = await updateTx.sign(operatorKey);
        
        // Execute the transaction
        console.log("Executing token update transaction...");
        const txResponse = await signedTx.execute(client);
        
        // Get the receipt
        const receipt = await txResponse.getReceipt(client);
        console.log("Token update status:", receipt.status.toString());
        
        if (receipt.status.toString() === "SUCCESS") {
            console.log("Successfully updated LYNX token supply key to the contract!");
            
            // Verify the update
            await checkLynxTokenProperties();
        } else {
            console.error("Failed to update LYNX token. Status:", receipt.status.toString());
        }

        console.log("LYNX token key update process completed.");
    } catch (error) {
        console.error("Error in updateLynxTokenKeys function:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    }
}

async function checkLynxTokenProperties() {
    try {
        console.log("Checking LYNX token properties...");
        
        // Use mirror node to get token info
        const response = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/tokens/${process.env.LYNX_TOKEN_ID}`
        );
        
        if (!response.ok) {
            console.error("Error fetching token info:", response.statusText);
            return;
        }
        
        const tokenData = await response.json();
        console.log("LYNX token info:");
        console.log("- Name:", tokenData.name);
        console.log("- Symbol:", tokenData.symbol);
        console.log("- Decimals:", tokenData.decimals);
        console.log("- Supply Key:", tokenData.supply_key?.key);
        console.log("- Treasury:", tokenData.treasury_account_id);
        
        // Check if contract address is admin or has supply permission
        if (tokenData.supply_key?.key) {
            // Convert contract ID to string for comparison
            const contractId = process.env.LYNX_CONTRACT_ADDRESS;
            const hasSupplyPermission = tokenData.supply_key.key === contractId;
            
            console.log("Contract has supply permission:", hasSupplyPermission);
            
            if (!hasSupplyPermission) {
                console.warn("WARNING: The contract does not appear to have supply permissions for the LYNX token!");
            } else {
                console.log("SUCCESS: The contract has supply permissions for the LYNX token!");
            }
        } else {
            console.warn("WARNING: No supply key found for the LYNX token!");
        }
    } catch (error) {
        console.error("Error checking token properties:", error.message);
    }
}

// Run the function and ensure the script exits
updateLynxTokenKeys()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 