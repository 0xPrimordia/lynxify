export const runtime = 'edge';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const formData = await req.formData();
  
  return new Response(JSON.stringify({ received: true }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
} 