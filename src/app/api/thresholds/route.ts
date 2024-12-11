import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

// modify to limit to current user
export async function GET(req:any, { params }:{params:any;}) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        console.log('Fetching thresholds for userId:', userId);

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        
        console.log('Querying thresholds table with userId:', userId);
        const { data, error } = await supabase
            .from('Thresholds')
            .select('*')
            .eq('userId', userId);
        
        console.log('Query result:', { data, error });

        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}