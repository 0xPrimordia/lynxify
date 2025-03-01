const { Client, TokenCreateTransaction, TokenType, TokenSupplyType, PrivateKey, AccountId } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: '.env.local' });
async function createLXYTokenMainnet() {
    if (!process.env.MAINNET_OPERATOR_KEY || !process.env.MAINNET_OPERATOR_ID) {
        throw new Error("Environment variables MAINNET_OPERATOR_KEY and MAINNET_OPERATOR_ID must be present");
    }
    const operatorKey = PrivateKey.fromString(process.env.MAINNET_OPERATOR_KEY);
    const operatorId = AccountId.fromString(process.env.MAINNET_OPERATOR_ID);
    // Create client for mainnet
    const client = Client.forMainnet()
        .setOperator(operatorId, operatorKey);
    try {
        // Create the token
        const transaction = await new TokenCreateTransaction()
            .setTokenName("Lynxify Governance Token")
            .setTokenSymbol("LYNXG")
            .setDecimals(8)
            .setInitialSupply(1000000000) // 10M tokens with 8 decimals
            .setMaxSupply(10000000000) // 100M max supply with 8 decimals
            .setTreasuryAccountId(operatorId)
            .setAdminKey(operatorKey)
            .setSupplyKey(operatorKey)
            .setFreezeDefault(false)
            .setTokenType(TokenType.FungibleCommon)
            .setSupplyType(TokenSupplyType.Finite)
            .freezeWith(client);
        const signedTx = await transaction.sign(operatorKey);
        const txResponse = await signedTx.execute(client);
        const receipt = await txResponse.getReceipt(client);
        console.log("Token created successfully!");
        if (!receipt.tokenId)
            throw new Error("Token ID was not returned");
        console.log("Token ID:", receipt.tokenId.toString());
        return receipt.tokenId.toString();
    }
    catch (error) {
        console.error("Error creating token:", error);
        throw error;
    }
    finally {
        client.close();
    }
}
createLXYTokenMainnet()
    .then(tokenId => console.log("Done! Token ID:", tokenId))
    .catch(err => console.error("Failed:", err));
