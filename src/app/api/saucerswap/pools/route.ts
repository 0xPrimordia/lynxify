import { Pool } from "@/app/types";

export async function GET() {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SAUCERSWAP_API}/v2/pools`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await response.json();
    
    // Filter pools to only include those where both tokens have completed due diligence
    const filteredData = data.filter((pool: Pool) => 
        pool.tokenA?.dueDiligenceComplete === true && 
        pool.tokenB?.dueDiligenceComplete === true
    );
    
    return Response.json(filteredData)
}