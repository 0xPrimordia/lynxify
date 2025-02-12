import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { User } from '@/app/types';
import SessionPasswordManager from '@/lib/utils/sessionPassword';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    // Apply rate limiting first
    const rateLimitResponse = await rateLimiterMiddleware(req, 'auth');
    if (!rateLimitResponse.ok) {
        return rateLimitResponse;
    }

    console.log('Starting in-app-wallet registration');
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { email, password, isInAppWallet } = await req.json();
        console.log('Received registration request:', { email, isInAppWallet });
        
        if (!email || !password) {
            console.log('Missing required fields');
            return NextResponse.json({ 
                error: 'Email and password are required' 
            }, { status: 400 });
        }

        console.log('Setting password in SessionPasswordManager');
        try {
            await SessionPasswordManager.setPassword(password);
            console.log('Password set successfully');
        } catch (error: any) {
            console.error('SessionPasswordManager error:', error);
            return NextResponse.json({ 
                error: error.message,
                stack: error.stack
            }, { status: 500 });
        }

        console.log('Creating auth user:', { email });
        const { data: userData, error: createError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
                data: {
                    isInAppWallet: true
                }
            }
        });

        if (createError) {
            // Handle specific Supabase errors
            if (createError.message.includes('rate limit')) {
                return NextResponse.json({ 
                    error: 'Too many attempts. Please try again later.' 
                }, { status: 429 });
            }
            if (createError.message.includes('already been registered')) {
                return NextResponse.json({ 
                    error: 'Email already registered. Please sign in.' 
                }, { status: 400 });
            }
            console.error('Auth user creation failed:', createError);
            throw createError;
        }

        console.log('Auth user created:', userData.user);

        // Create DB record without Hedera account ID
        const newUser: User = {
            id: userData?.user?.id || '',
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
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
} 