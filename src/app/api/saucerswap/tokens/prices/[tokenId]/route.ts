import { NextResponse } from 'next/server';

export async function GET(req:any, { params }:{params:any;}) {
    const { tokenId } = params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const interval = searchParams.get('interval');

    if (!tokenId || !from || !to || !interval) {
        return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_SAUCERSWAP_API}/tokens/prices/${tokenId}?from=${from}&to=${to}&interval=${interval}`;
    console.log('Fetching from SaucerSwap API:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        const data = await response.json(); // Get the actual error message
        
        if (!response.ok) {
            console.error('SaucerSwap API error:', data);
            throw new Error(data.error || 'Failed to fetch token price history');
        }
        
        return NextResponse.json(data);
    } catch (error:any) {
        console.error('Price fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}