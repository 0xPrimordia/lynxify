export async function GET() {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SAUCERSWAP_API}/v2/pools`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await response.json();
    
    return Response.json(data)
}