const TESTNET = "https://test-api.saucerswap.finance";
const MAINAPI = "https://api.saucerswap.finance"

export async function GET() {
    const response = await fetch(`${MAINAPI}/tokens/known`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await response.json();
    
    return Response.json(data)
}