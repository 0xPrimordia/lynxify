const TESTNET = "https://test-api.saucerswap.finance";

export async function GET() {
    const response = await fetch(`${TESTNET}/tokens`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await response.json();
    
    return Response.json(data)
}