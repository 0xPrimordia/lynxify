import { NextResponse } from 'next/server';
const TESTAPI = "https://test-api.saucerswap.finance";
const MAINAPI = "https://api.saucerswap.finance"

export async function GET(req:any, { params }:{params:any;}) {
    const { tokenId } = params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const interval = searchParams.get('interval');

    if (!tokenId || !from || !to || !interval) {
        return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    const apiUrl = `${TESTAPI}/tokens/prices/${tokenId}?from=${from}&to=${to}&interval=${interval}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch token price history');
        }
        const data = await response.json();
        return NextResponse.json(data);
      } catch (error:any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
}