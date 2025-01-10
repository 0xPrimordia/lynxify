import { NextRequest, NextResponse } from 'next/server';
import { 
    Client, 
    AccountId, 
    PrivateKey, 
    AccountCreateTransaction,
    PublicKey,
    Hbar 
} from "@hashgraph/sdk";

export async function POST(req: NextRequest) {
    try {
        const { publicKey } = await req.json();

        // Initialize Hedera client
        const client = Client.forTestnet();
        
        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
            throw new Error('Environment variables for Hedera operator not configured');
        }

        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
        
        client.setOperator(operatorId, operatorKey);

        // Create the account
        const transaction = await new AccountCreateTransaction()
            .setKey(PublicKey.fromString(publicKey))
            .setInitialBalance(Hbar.fromTinybars(0))
            .execute(client);

        const receipt = await transaction.getReceipt(client);
        const newAccountId = receipt.accountId!;

        return NextResponse.json({ 
            accountId: newAccountId.toString() 
        });

    } catch (error) {
        console.error('Error creating Hedera account:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
} 