const { 
    Client: AssociateClient,
    AccountId: AssociateAccountId,
    PrivateKey: AssociatePrivateKey,
    TokenAssociateTransaction: AssociateTokenTx,
    TokenId: AssociateTokenId,
    Hbar: AssociateHbar
} = require("@hashgraph/sdk");
const associateDotenv = require("dotenv");

associateDotenv.config({ path: '.env.local' });

async function associateTokens() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, SAUCE_TOKEN_ID, CLXY_TOKEN_ID');
    }

    const client = AssociateClient.forTestnet();
    const operatorId = AssociateAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    const operatorKey = AssociatePrivateKey.fromString(process.env.OPERATOR_KEY!);
    client.setOperator(operatorId, operatorKey);

    const contractId = AssociateAccountId.fromString(process.env.LYNX_CONTRACT_ADDRESS!);
    const sauceTokenId = AssociateTokenId.fromString(process.env.SAUCE_TOKEN_ID!);
    const clxyTokenId = AssociateTokenId.fromString(process.env.CLXY_TOKEN_ID!);

    // Associate tokens with contract
    console.log("Associating tokens with contract...");
    console.log("Contract ID:", contractId.toString());
    console.log("SAUCE Token ID:", sauceTokenId.toString());
    console.log("CLXY Token ID:", clxyTokenId.toString());

    const associateTokensTx = new AssociateTokenTx()
        .setAccountId(contractId)
        .setTokenIds([sauceTokenId, clxyTokenId])
        .setMaxTransactionFee(new AssociateHbar(30));

    const associateTokensSubmit = await associateTokensTx
        .freezeWith(client)
        .sign(operatorKey);

    const associateTokensResponse = await associateTokensSubmit.execute(client);
    await associateTokensResponse.getReceipt(client);
    console.log("Tokens associated with contract");
}

associateTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 