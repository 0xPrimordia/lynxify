import { NextResponse } from 'next/server';
import { Pool } from "@/app/types";

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_SAUCERSWAP_API;
    
    if (!apiUrl) {
        return NextResponse.json({ error: 'SaucerSwap API URL not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`${apiUrl}/v2/pools`);
        const data = await response.json();
        
        // Filter pools to only include those where both tokens have completed due diligence
        const filteredData = data.filter((pool: Pool) => 
            pool.tokenA?.dueDiligenceComplete === true && 
            pool.tokenB?.dueDiligenceComplete === true
        );
        
        return NextResponse.json(filteredData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch pools' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';