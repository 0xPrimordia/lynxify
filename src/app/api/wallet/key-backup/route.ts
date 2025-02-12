import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { rateLimiterMiddleware } from '@/middleware/rateLimiter';

export async function POST(req: NextRequest) {
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const { encryptedKey, userId } = await req.json();
        
        if (!encryptedKey || !userId) {
            return NextResponse.json({ 
                error: 'Encrypted key and user ID are required' 
            }, { status: 400 });
        }

        // Store encrypted key backup
        const { error } = await supabase
            .from('KeyBackups')
            .upsert({
                user_id: userId,
                encrypted_key: encryptedKey,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        return NextResponse.json({ 
            message: 'Key backup stored successfully' 
        });

    } catch (error: any) {
        console.error('Key backup error:', error);
        throw error;
    }
}

export async function GET(req: NextRequest) {
    const rateLimitResponse = await rateLimiterMiddleware(req, 'wallet');
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);
    
    try {
        const userId = req.headers.get('x-user-id');
        
        if (!userId) {
            return NextResponse.json({ 
                error: 'User ID is required' 
            }, { status: 400 });
        }

        // Retrieve encrypted key backup
        const { data, error } = await supabase
            .from('KeyBackups')
            .select('encrypted_key')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ 
                error: 'No key backup found' 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            encryptedKey: data.encrypted_key 
        });

    } catch (error: any) {
        console.error('Key retrieval error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to retrieve key backup' },
            { status: 500 }
        );
    }
} 