import { NextRequest, NextResponse } from 'next/server'; 
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(config);

export async function POST(req: NextRequest) {
  try {
    const { public_token, user_id } = await req.json();
    console.log('Exchanging token for user:', user_id);
    
    const response = await client.itemPublicTokenExchange({ public_token });
    const { access_token } = response.data;
    
    // Here you might want to store the access_token in your database
    // associated with the user_id
    
    return NextResponse.json({ access_token });
  } catch (error) {
    console.error('Plaid exchange error:', error);
    return NextResponse.json({ error: 'Error exchanging public token' }, { status: 500 });
  }
}