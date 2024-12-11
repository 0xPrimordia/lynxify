import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        // Extract query parameters
        const sourceNetworkId = searchParams.get('sourceNetworkId');
        const sourceAssetId = searchParams.get('sourceAssetId');
        const targetNetworkId = searchParams.get('targetNetworkId');
        const amount = searchParams.get('amount');
        const recipient = searchParams.get('recipient');

        if (!sourceNetworkId || !sourceAssetId || !targetNetworkId || !amount || !recipient) {
            return new NextResponse(
                JSON.stringify({ error: 'Missing required query parameters' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const url = new URL('https://testnet.api.hashport.network/api/v1/bridge/validate');
        url.searchParams.append('sourceNetworkId', sourceNetworkId);
        url.searchParams.append('sourceAssetId', sourceAssetId);
        url.searchParams.append('targetNetworkId', "296");
        url.searchParams.append('amount', amount);
        url.searchParams.append('recipient', recipient);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return new NextResponse(
                JSON.stringify({ error: 'Error from external API', details: data }),
                { 
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        return new NextResponse(
            JSON.stringify(data),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error: any) {
        console.error('Hashport validation error:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}