import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { Client, AccountCreateTransaction, Hbar, PrivateKey } from "@hashgraph/sdk";
import { storePrivateKey } from '@/lib/utils/keyStorage';
import { rateLimit } from '@/lib/utils/rateLimiter';
import SessionPasswordManager from '@/lib/utils/sessionPassword';

export async function GET(req: NextRequest) {
    // Rate limiting
    const rateLimitResult = await rateLimit(req, 'auth');
    if (!rateLimitResult.success) {
        return NextResponse.json({ 
            error: 'Too many attempts', 
            retryAfter: rateLimitResult.reset 
        }, { status: 429 });
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore);
    
    try {
        const searchParams = req.nextUrl.searchParams;
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'email') {
            return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
        }

        // Verify the email
        const { data: { user }, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
        });

        if (verifyError) throw verifyError;
        if (!user) throw new Error('User not found after verification');

        console.log('Email verified for user:', user.id);

        // Check if this is an in-app wallet user
        if (user.user_metadata?.isInAppWallet) {
            console.log('Processing in-app wallet verification');
            
            // Get password from session first
            const password = await SessionPasswordManager.getPassword();
            if (!password) {
                throw new Error('No session password available');
            }

            // Create Hedera account
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/create-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicKey: PrivateKey.generateED25519().publicKey.toString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create Hedera account');
            }

            const { accountId, privateKey } = await response.json();
            console.log('Hedera account created:', accountId);

            // Store the Hedera-generated private key
            await storePrivateKey(user.id, privateKey, password);
            console.log('Private key stored successfully');

            // Update auth user metadata
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                {
                    user_metadata: {
                        ...user.user_metadata,
                        hederaAccountId: accountId
                    }
                }
            );

            if (updateError) {
                console.error('Failed to update auth metadata:', updateError);
                throw updateError;
            }
            console.log('Auth metadata updated successfully');

            // Update Users table record
            const { error: dbUpdateError } = await supabase
                .from('Users')
                .update({ hederaAccountId: accountId })
                .eq('id', user.id);

            if (dbUpdateError) {
                console.error('Failed to update Users table:', dbUpdateError);
                throw dbUpdateError;
            }
            console.log('Users table updated successfully');
            
            // Clear session password after successful storage
            await SessionPasswordManager.clearPassword();
            console.log('Session password cleared');
        }

        // Redirect to success page
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?success=true`
        );

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=${encodeURIComponent(error.message)}`
        );
    }
}

export async function POST(req: NextRequest) {
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const user = session.user;

        // Check if this is an in-app wallet user
        if (!user.user_metadata?.isInAppWallet) {
            return NextResponse.json({ error: 'Not an in-app wallet user' }, { status: 400 });
        }

        // Create Hedera account
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/create-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicKey: PrivateKey.generateED25519().publicKey.toString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create Hedera account');
        }

        const { accountId, privateKey } = await response.json();

        // Update auth user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            {
                user_metadata: {
                    ...user.user_metadata,
                    hederaAccountId: accountId
                }
            }
        );

        if (updateError) throw updateError;

        // Update Users table record
        const { error: dbUpdateError } = await supabase
            .from('Users')
            .update({ hederaAccountId: accountId })
            .eq('id', user.id);

        if (dbUpdateError) throw dbUpdateError;

        return NextResponse.json({ accountId, privateKey });

    } catch (error: any) {
        console.error('Wallet creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create wallet' },
            { status: 500 }
        );
    }
} 