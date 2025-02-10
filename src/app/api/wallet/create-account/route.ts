import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        // Get userId from middleware-injected header
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'User context not found' }, { status: 401 });
        }

        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        // Generate key pair for Hedera account
        const privateKey = PrivateKey.generateED25519();
        const publicKey = privateKey.publicKey;
        
        // Initialize Hedera client
        const client = Client.forName(process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet');
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY!);
        client.setOperator(operatorId, operatorKey);

        // Create Hedera account
        const transaction = new AccountCreateTransaction()
            .setKey(publicKey)
            .setInitialBalance(new Hbar(0.5))
            .setMaxAutomaticTokenAssociations(10);

        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);
        const newAccountId = receipt.accountId;

        if (!newAccountId) {
            throw new Error('Failed to get new account ID from receipt');
        }

        // Create User record with Hedera account ID
        const { error: insertError } = await supabase
            .from('Users')
            .insert({
                id: userId,
                created_at: new Date().toISOString(),
                hederaAccountId: newAccountId.toString(),
                isInAppWallet: true
            });

        if (insertError) {
            throw new Error(`Failed to create user record: ${insertError.message}`);
        }

        // Update user metadata
        const { error: metadataError } = await supabase.auth.admin.updateUserById(
            userId,
            { 
                user_metadata: { 
                    isInAppWallet: true,
                    hederaAccountId: newAccountId.toString()
                }
            }
        );

        if (metadataError) {
            throw new Error(`Failed to update user metadata: ${metadataError.message}`);
        }

        return NextResponse.json({
            accountId: newAccountId.toString(),
            privateKey: privateKey.toString()
        });

    } catch (error: any) {
        console.error('Account creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create account' },
            { status: 500 }
        );
    }
} 