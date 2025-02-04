import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        // Get token from URL
        const searchParams = new URL(req.url).searchParams;
        const token = searchParams.get('token');
        
        if (!token) {
            return NextResponse.redirect('/auth/error?message=Invalid verification link');
        }

        // Verify the token hash from the email
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
        });

        if (error) {
            console.error('Verification error:', error);
            return NextResponse.redirect('/auth/error?message=Verification failed');
        }

        // After verification, prompt for MFA setup
        return NextResponse.redirect('/auth/setup-mfa');

    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.redirect('/auth/error?message=Verification failed');
    }
} 