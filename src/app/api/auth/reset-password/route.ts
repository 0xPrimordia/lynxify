import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiterMiddleware(req, 'reset');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { email } = await req.json();
        
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Verify this is an in-app wallet user
        const { data: users } = await supabase
            .from('Users')
            .select('isInAppWallet')
            .eq('email', email)
            .single();

        if (!users?.isInAppWallet) {
            return NextResponse.json({ 
                error: 'Account not found or not an in-app wallet' 
            }, { status: 404 });
        }

        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
        });

        if (error) throw error;

        return NextResponse.json({ 
            message: 'Password reset instructions sent' 
        });

    } catch (error: any) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send reset instructions' },
            { status: 500 }
        );
    }
} 