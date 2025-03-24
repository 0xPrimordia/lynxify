import { NextResponse } from 'next/server';
import { Client, TokenAssociateTransaction, AccountId, TokenId, TransactionId } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';

export async function POST(req: Request) {
    try {
        const { accountId } = await req.json();
        
        if (!process.env.LYNX_TOKEN_ID) {
            throw new Error('Missing LYNX_TOKEN_ID environment variable');
        }
        
        const client = Client.forTestnet();
        const senderAccountId = AccountId.fromString(accountId);
        const tokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        
        // Create token association transaction
        const transaction = new TokenAssociateTransaction()
            .setAccountId(senderAccountId)
            .setTokenIds([tokenId])
            .setTransactionId(TransactionId.generate(senderAccountId))
            .freezeWith(client);
        
        const encodedTx = transactionToBase64String(transaction);
        
        return NextResponse.json({ 
            transaction: encodedTx,
            description: "Associate account with LYNX token"
        });
        
    } catch (error: any) {
        console.error('Token association error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 