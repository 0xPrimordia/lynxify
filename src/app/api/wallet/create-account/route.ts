import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PublicKey, AccountId, PrivateKey } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';
import { storePrivateKey } from '@/lib/utils/keyStorage';

export async function POST(req: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    try {
        // Get the authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Missing authorization header' }, { status: 401 });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];
        
        // Create Supabase client with the token
        const cookieStore = cookies();
        const supabase = createServerSupabase(cookieStore);
        
        // Set the session manually
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            console.error('Auth error:', authError);
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        console.log('Authenticated user:', user.id);

        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ message: 'Password required' }, { status: 400 });
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
            throw new Error('Failed to get new account ID');
        }

        // Store private key
        await storePrivateKey(user.id, privateKey.toString(), password);

        // Update Users table with Hedera account ID
        const { error: dbError } = await supabase
            .from('Users')
            .update({ hederaAccountId: newAccountId.toString() })
            .eq('id', user.id);

        if (dbError) {
            throw new Error('Failed to update user record');
        }

        return NextResponse.json({ 
            accountId: newAccountId.toString(),
            privateKey: privateKey.toString()
        });
    } catch (error: any) {
        console.error('Create account error:', error);
        if (error.status === 401) {
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 