import { AccountId, Client, TokenId, TransferTransaction, TokenAssociateTransaction, AccountInfoQuery } from "@hashgraph/sdk";

let SAUCE_TOKEN_ID: string;
if (process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'testnet') {
    SAUCE_TOKEN_ID = "0.0.1183558";
} else {
    SAUCE_TOKEN_ID = "0.0.731861";
}

export async function rewardNewWallet(
    client: Client,
    recipientId: string,
    operatorId: string,
    operatorKey: string
) {
    // First check if token is associated
    const accountId = AccountId.fromString(recipientId);
    const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
    const tokenRelationship = accountInfo.tokenRelationships.get(TokenId.fromString(SAUCE_TOKEN_ID));
    const isAssociated = tokenRelationship !== undefined;

    if (!isAssociated) {
        console.log('Associating SAUCE token with new wallet...');
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([TokenId.fromString(SAUCE_TOKEN_ID)])
            .execute(client);
        
        await associateTx.getReceipt(client);
        console.log('Token associated successfully');
    }

    // Fixed amount of 100 SAUCE (with 6 decimals)
    const sauceAmount = 100 * Math.pow(10, 6);

    console.log('Rewarding new wallet:', {
        recipientId,
        sauceAmount,
        tokenAmount: 100
    });

    // Create transfer transaction
    const transaction = new TransferTransaction()
        .addTokenTransfer(
            TokenId.fromString(SAUCE_TOKEN_ID),
            AccountId.fromString(operatorId),
            -sauceAmount
        )
        .addTokenTransfer(
            TokenId.fromString(SAUCE_TOKEN_ID),
            accountId,
            sauceAmount
        );

    // Execute transfer
    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    return {
        success: receipt.status.toString() === "SUCCESS",
        amount: sauceAmount,
        tokenId: SAUCE_TOKEN_ID
    };
} 