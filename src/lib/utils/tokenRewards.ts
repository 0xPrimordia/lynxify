import { AccountId, Client, TokenId, TransferTransaction, TokenAssociateTransaction } from "@hashgraph/sdk";
import { AccountInfoQuery } from "@hashgraph/sdk";

const SAUCE_TOKEN_ID = "0.0.1183558"; // From your test files

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

    // Fetch current SAUCE price from SaucerSwap API
    const priceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SAUCERSWAP_API}/tokens/${SAUCE_TOKEN_ID}`
    );
    
    if (!priceResponse.ok) {
        throw new Error('Failed to fetch SAUCE token data');
    }

    const tokenData = await priceResponse.json();
    
    // After fetching price data but before calculating amount
    if (!tokenData.priceUsd || tokenData.priceUsd <= 0) {
        throw new Error('Invalid token price');
    }

    // Calculate amount of SAUCE for $5 USD
    const usdAmount = 5;
    const sauceAmount = Math.floor((usdAmount / Number(tokenData.priceUsd)) * Math.pow(10, tokenData.decimals));

    console.log('Rewarding new wallet:', {
        recipientId,
        sauceAmount,
        usdEquivalent: usdAmount
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