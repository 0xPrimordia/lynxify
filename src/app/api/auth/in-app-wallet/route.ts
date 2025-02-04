import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { User } from '@/app/types';

export async function POST(req: NextRequest) {
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { accountId, email, password } = await req.json();
        
        if (!accountId || !email || !password) {
            return NextResponse.json({ 
                error: 'Account ID, email, and password are required' 
            }, { status: 400 });
        }

        console.log('Creating auth user:', { accountId, email });
        const { data: userData, error: createError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
                data: {
                    hederaAccountId: accountId,
                    isInAppWallet: true
                }
            }
        });

        if (createError) {
            if (createError.message.includes('already been registered')) {
                return NextResponse.json({ 
                    error: 'Email already registered. Please sign in or use a different email.' 
                }, { status: 400 });
            }
            console.error('Auth user creation failed:', createError);
            throw createError;
        }

        console.log('Auth user created:', userData.user);

        // Create DB record
        const newUser: User = {
            id: userData?.user?.id || '',
            hederaAccountId: accountId,
            created_at: new Date().toISOString(),
            isInAppWallet: true
        };

        console.log('Inserting DB record:', newUser);
        const { error: insertError } = await supabase
            .from('Users')
            .insert(newUser);

        if (insertError) {
            console.error('DB insert failed:', insertError);
            throw insertError;
        }

        console.log('DB record created successfully');

        return NextResponse.json({ 
            message: 'Please verify your email to complete setup',
            userId: userData?.user?.id || '',
            status: 'verification_sent'
        });

    } catch (error: any) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: error.message || 'Authentication failed' },
            { status: 500 }
        );
    }
} 