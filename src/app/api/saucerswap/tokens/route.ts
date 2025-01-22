import { NextResponse } from 'next/server';

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_SAUCERSWAP_API;
    
    if (!apiUrl) {
        return NextResponse.json({ error: 'SaucerSwap API URL not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`${apiUrl}/tokens/known`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';