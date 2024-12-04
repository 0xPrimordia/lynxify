export async function GET() {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SAUCERSWAP_API}/tokens/known`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await response.json();
    
    return Response.json(data)
}