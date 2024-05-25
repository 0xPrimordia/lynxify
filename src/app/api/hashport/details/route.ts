import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sourceNetworkId = searchParams.get('sourceNetworkId');
    const sourceAssetId = searchParams.get('sourceAssetId');

    try {
        const res = await fetch(`https://testnet.api.hashport.network/api/v1/networks/${sourceNetworkId}/assets/${sourceAssetId}`, {
            headers: {
            'Content-Type': 'application/json'
            },
        })
        const data = await res.json()
    
        if (!res.ok) {
            return NextResponse.json({ message: 'Error from external API', details: data }, { status: res.status });
        }
    
        return NextResponse.json(data, { status: 200 });
    } catch (error:any) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
    
}