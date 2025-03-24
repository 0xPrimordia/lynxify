import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { accountId } = await req.json();
        
        if (!process.env.LYNX_TOKEN_ID) {
            throw new Error('Missing LYNX_TOKEN_ID environment variable');
        }
        
        // Query the account info via mirror node to check token relationships
        const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${process.env.LYNX_TOKEN_ID}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // If tokens array is empty, the account is not associated
        const isAssociated = data.tokens && data.tokens.length > 0;
        
        return NextResponse.json({ 
            isAssociated,
            tokenId: process.env.LYNX_TOKEN_ID
        });
        
    } catch (error: any) {
        console.error('Association check error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 