import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

// modify to limit to current user
export async function GET(req:any, { params }:{params:any;}) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return new NextResponse(
                JSON.stringify({ error: 'User ID is required' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Thresholds')
            .select('*')
            .eq('userId', userId);

        if (error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Ensure data is serializable
        const safeData = data ? JSON.parse(JSON.stringify(data)) : [];
        
        return new NextResponse(
            JSON.stringify(safeData),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        return new NextResponse(
            JSON.stringify({ error: 'An unexpected error occurred' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}