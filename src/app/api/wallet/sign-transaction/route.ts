import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    // Apply rate limiting for transaction signing
    const rateLimitResponse = await rateLimiterMiddleware(req, 'sign');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { transaction, userId } = await req.json();
        
        if (!transaction || !userId) {
            return NextResponse.json({ 
                error: 'Transaction and user ID are required' 
            }, { status: 400 });
        }

        // Rest of signing implementation...
    } catch (error: any) {
        console.error('Transaction signing error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sign transaction' },
            { status: 500 }
        );
    }
} 