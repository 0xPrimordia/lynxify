import { NextRequest, NextResponse } from 'next/server';
import { AccountBalanceQuery, AccountId, Client, TokenId } from "@hashgraph/sdk";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');
    const tokenId = url.searchParams.get('tokenId');

    if (!accountId || !tokenId) {
        return NextResponse.json(
            { error: 'Missing accountId or tokenId parameter' },
            { status: 400 }
        );
    }

    try {
        // Query the balance using mirror node instead of direct client
        const mirrorNodeUrl = `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
        
        const response = await fetch(mirrorNodeUrl);
        const data = await response.json();

        if (!data.tokens || data.tokens.length === 0) {
            return NextResponse.json(
                { balance: "0" },
                { status: 200 }
            );
        }

        const balance = data.tokens[0].balance;

        return NextResponse.json(
            { balance: balance },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error fetching token balance:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token balance' },
            { status: 500 }
        );
    }
} 