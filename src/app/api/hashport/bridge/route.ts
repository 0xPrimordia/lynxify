import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest ) {
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const sourceNetworkId = searchParams.get('sourceNetworkId');
    const sourceAssetId = searchParams.get('sourceAssetId');
    const targetNetworkId = searchParams.get('targetNetworkId');
    const amount = searchParams.get('amount');
    const recipient = searchParams.get('recipient');

    if (!sourceNetworkId || !sourceAssetId || !targetNetworkId || !amount || !recipient) {
        return NextResponse.json({ message: 'Missing required query parameters from Lynxify' }, { status: 400 });
    }

    const url = new URL('https://testnet.api.hashport.network/api/v1/bridge');
    url.searchParams.append('sourceNetworkId', sourceNetworkId);
    url.searchParams.append('sourceAssetId', sourceAssetId);
    url.searchParams.append('targetNetworkId', "296");
    url.searchParams.append('amount', amount);
    url.searchParams.append('recipient', recipient);

    try {
        // Perform the external API GET request
        const response = await fetch(url.toString(), {
          method: 'GET',
        });
    
        // Handle the response from the external API
        const data = await response.json();
    
        if (!response.ok) {
          return NextResponse.json({ message: 'Error from external API', details: data }, { status: response.status });
        }
    
        return NextResponse.json(data, { status: 200 });
      } catch (error:any) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
      }
}