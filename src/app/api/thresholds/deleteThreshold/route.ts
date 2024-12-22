import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Threshold ID is required' },
                { status: 400 }
            );
        }

        // First check if the threshold exists
        const { data: threshold, error: fetchError } = await supabase
            .from('Thresholds')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !threshold) {
            return NextResponse.json(
                { error: 'Threshold not found', details: fetchError?.message },
                { status: 404 }
            );
        }

        // Delete the threshold
        const { error: deleteError } = await supabase
            .from('Thresholds')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete threshold', details: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Threshold deleted successfully' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 