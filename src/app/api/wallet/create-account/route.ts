import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PublicKey, AccountId, PrivateKey } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    // Apply rate limiting - stricter limits for account creation
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { publicKey } = await req.json();
        
        if (!publicKey) {
            return NextResponse.json({ error: 'Public key is required' }, { status: 400 });
        }

        // Initialize the Hedera client with treasury account
        const client = Client.forName(process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet');
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY!);
        client.setOperator(operatorId, operatorKey);

        // Create new account
        const transaction = new AccountCreateTransaction()
            .setKey(PublicKey.fromString(publicKey))
            .setInitialBalance(new Hbar(0.5)) // Initial balance for fees
            .setMaxAutomaticTokenAssociations(10); // Allow some automatic token associations

        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);
        const newAccountId = receipt.accountId;

        if (!newAccountId) {
            throw new Error('Failed to get new account ID');
        }

        return NextResponse.json({ accountId: newAccountId.toString() });
    } catch (error: any) {
        console.error('Error creating Hedera account:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create account' },
            { status: 500 }
        );
    }
} 