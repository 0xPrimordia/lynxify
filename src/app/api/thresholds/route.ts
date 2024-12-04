import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

// modify to limit to current user
export async function GET(req:any, { params }:{params:any;}) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log('Starting GET request...');
        const supabasePromise = createClient();
        console.log('Supabase client promise created:', supabasePromise);
        
        const supabase = await supabasePromise;
        console.log('Supabase client resolved:', supabase);

        if (!supabase || typeof supabase.from !== 'function') {
            console.error('Supabase client initialization failed. Client:', supabase);
            throw new Error('Supabase client is not properly initialized');
        }

        console.log('Attempting to query thresholds table...');
        const { data, error } = await supabase.from('Thresholds').select('*').eq('userId', userId);
        
        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        console.log('Query successful. Data:', data);
        
        // Check if data is empty
        if (!data || data.length === 0) {
            console.log('No data found in thresholds table');
            return NextResponse.json([], { status: 200 });
        }
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}