import { NextRequest, NextResponse } from 'next/server';
import { resetRateLimits } from '@/lib/utils/rateLimiter';

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV !== 'test') {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    try {
        const success = await resetRateLimits(req.ip || 'anonymous');
        return NextResponse.json({ success });
    } catch (error) {
        console.error('Failed to reset rate limits:', error);
        return NextResponse.json(
            { error: 'Failed to reset rate limits' },
            { status: 500 }
        );
    }
}