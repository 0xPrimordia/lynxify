import { NextResponse } from 'next/server';
import { Token } from "@/app/types";

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_SAUCERSWAP_API;
    
    if (!apiUrl) {
        return NextResponse.json({ error: 'SaucerSwap API URL not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`${apiUrl}/tokens/known`);
        const data = await response.json();
        
        // Filter tokens to only include those that have completed due diligence
        const filteredData = data.filter((token: Token) => 
            token.dueDiligenceComplete === true
        );
        
        return NextResponse.json(filteredData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';