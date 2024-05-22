export async function GET() {
    const res = await fetch('https://testnet.api.hashport.network/api/v1/assets', {
        headers: {
        'Content-Type': 'application/json'
        },
    })
    const data = await res.json()
 
    return Response.json({ data })
}