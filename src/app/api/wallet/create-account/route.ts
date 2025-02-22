import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';
import { rewardNewWallet } from '@/lib/utils/tokenRewards';

export async function POST(req: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    console.log('Creating account with headers:', req.headers);
    
    const cookieStore = cookies();
    console.log('Starting wallet creation with cookies:', cookieStore.getAll());

    try {
        // Log admin mode and client creation attempt
        console.log('Attempting to create Supabase client with:', {
            adminMode: true,
            cookiesPresent: cookieStore.getAll().length > 0
        });

        const supabase = createServerSupabase(cookieStore, true);
        
        // Log successful client creation
        console.log('Supabase client created successfully:', {
            isInitialized: !!supabase,
            hasAuthMethods: !!supabase.auth,
            hasFromMethod: !!supabase.from
        });

        // Log user context and headers
        const userId = req.headers.get('x-user-id');
        console.log('User context:', { 
            userId,
            headers: req.headers
        });

        if (!userId) {
            console.log('No userId found in headers - returning 401');
            return NextResponse.json({ error: 'User context not found' }, { status: 401 });
        }

        const { password } = await req.json();
        if (!password) {
            console.log('No password provided in request body');
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

        console.log('Creating Hedera account for user:', userId);
        
        // Create Hedera account
        const transaction = new AccountCreateTransaction()
            .setKey(publicKey)
            .setInitialBalance(new Hbar(0.5))
            .setMaxAutomaticTokenAssociations(-1);

        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);
        const newAccountId = receipt.accountId;

        if (!newAccountId) {
            console.error('Failed to get account ID from receipt');
            throw new Error('Failed to get new account ID from receipt');
        }

        console.log('Hedera account created:', newAccountId.toString());

        // Before database operation
        const userRecord = {
            id: userId,
            created_at: new Date().toISOString(),
            hederaAccountId: newAccountId.toString(),
            isInAppWallet: true
        };
        console.log('Attempting database insert with record:', userRecord);

        const { data: insertData, error: insertError } = await supabase
            .from('Users')
            .insert(userRecord)
            .select()
            .single();

        // Detailed database result
        console.log('Database operation complete:', {
            success: !insertError,
            error: insertError,
            data: insertData,
            userId,
            hederaAccountId: newAccountId.toString()
        });

        if (insertError) {
            console.error('Failed to create user record:', insertError);
            console.error('Hedera account created but database insert failed:', newAccountId.toString());
            throw new Error('Failed to create user record');
        }

        // After insert, verify the record exists
        console.log('Verifying database record...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('Users')
            .select()
            .eq('id', userId)
            .single();
            
        console.log('Verification result:', {
            recordFound: !!verifyData,
            error: verifyError,
            data: verifyData
        });

        // Update user metadata
        console.log('Updating user metadata');
        const updatedMetadata = {
            isInAppWallet: true,
            hederaAccountId: newAccountId.toString(),
            initialReward: {
                amount: 0,
                tokenId: '',
                timestamp: new Date().toISOString()
            }
        };

        const { error: metadataError } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: updatedMetadata }
        );

        if (metadataError) {
            console.error('Failed to update user metadata:', metadataError);
        }

        // After successful account creation
        try {
            const rewardResult = await rewardNewWallet(
                client,
                newAccountId.toString(),
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                process.env.OPERATOR_KEY!
            );

            console.log('Initial reward result:', rewardResult);

            // Update user metadata to include reward info
            const updatedMetadata = {
                isInAppWallet: true,
                hederaAccountId: newAccountId.toString(),
                initialReward: {
                    amount: rewardResult.amount,
                    tokenId: rewardResult.tokenId,
                    timestamp: new Date().toISOString()
                }
            };

            const { error: rewardMetadataError } = await supabase.auth.admin.updateUserById(
                userId,
                { user_metadata: updatedMetadata }
            );

            if (rewardMetadataError) {
                console.error('Failed to update reward metadata:', rewardMetadataError);
            }
        } catch (rewardError) {
            // Log error but don't fail wallet creation
            console.error('Failed to send initial reward:', rewardError);
        }

        // Log successful completion
        console.log('Wallet creation completed successfully:', {
            userId,
            hederaAccountId: newAccountId.toString()
        });

        return NextResponse.json({
            accountId: newAccountId.toString(),
            privateKey: privateKey.toString()
        });
    } catch (error: any) {
        console.error('Wallet creation error:', {
            error,
            userId: req.headers.get('x-user-id'),
            stack: error.stack
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 