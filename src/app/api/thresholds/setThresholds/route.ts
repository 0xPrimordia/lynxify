import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  console.log('Starting POST request...');
  const supabase = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.log('Supabase client created:', supabase);

  // Function to add threshold to Supabase
  async function addThresholdToSupabase(data: {
    stopLoss: number,
    buyOrder: number,
    stopLossCap: number,
    buyOrderCap: number,
    hederaAccountId: string,
    tokenA: string,
    tokenB: string,
    fee: number,
    userId: string
  }) {
    try {
      console.log('Attempting to insert data into Supabase:', data);
      console.log('Supabase client:', supabase);

      const { data: insertedData, error } = await supabase
        .from('Thresholds')
        .insert([
          {
            stopLoss: data.stopLoss,
            buyOrder: data.buyOrder,
            stopLossCap: data.stopLossCap,
            buyOrderCap: data.buyOrderCap,
            hederaAccountId: data.hederaAccountId,
            tokenA: data.tokenA,
            tokenB: data.tokenB,
            fee: data.fee,
            userId: data.userId
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Error inserting threshold into Supabase: ${error.message}`);
      }

      console.log('Data successfully inserted into Supabase:', insertedData);
      return insertedData;
    } catch (error) {
      console.error('Detailed error in addThresholdToSupabase:', error);
      throw error;
    }
  }

  try {
    // Log the content type
    console.log('Content-Type:', req.headers.get('content-type'));

    // Attempt to read the raw body
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { stopLoss, buyOrder, stopLossCap, buyOrderCap, hederaAccountId, tokenA, tokenB, fee, userId } = parsedBody;
    
    console.log('Parsed request data:', { stopLoss, buyOrder, stopLossCap, buyOrderCap, hederaAccountId, tokenA, tokenB, fee, userId });

    // Check if any of the required fields are undefined, null, or empty string
    if (stopLoss === undefined || stopLoss === null || stopLoss === '' ||
        buyOrder === undefined || buyOrder === null || buyOrder === '' ||
        stopLossCap === undefined || stopLossCap === null || stopLossCap === '' ||
        buyOrderCap === undefined || buyOrderCap === null || buyOrderCap === '' ||
        !hederaAccountId || !tokenA || !tokenB || !fee || !userId) {
      console.error('Missing required fields:', { stopLoss, buyOrder, stopLossCap, buyOrderCap, hederaAccountId, tokenA, tokenB, fee, userId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert numeric strings to numbers if necessary
    const data = {
      stopLoss: Number(stopLoss),
      buyOrder: Number(buyOrder),
      stopLossCap: Number(stopLossCap),
      buyOrderCap: Number(buyOrderCap),
      hederaAccountId,
      tokenA: tokenA,
      tokenB: tokenB,
      fee: fee,
      userId
    };

    console.log('Data to be inserted:', data);

    const insertedData = await addThresholdToSupabase(data);

    if (!insertedData || insertedData.length === 0) {
      return NextResponse.json({ error: 'Failed to insert data' }, { status: 500 });
    }

    // move contract call to a different route
    /*const accountId = AccountId.fromString(userAddress);
    const evmAddress = accountId.toSolidityAddress();
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const signer = await provider.getSigner(evmAddress);
  
    const contract = new ethers.Contract("0xa112f1106add7504a54aa1217541449ed4e35413", abi, signer);
    await contract.setThresholds(stopLoss, buyOrder, stopLossCap, buyOrderCap, hederaAccountId, tokenId);*/
    return new Response('Thresholds set successfully!', { status: 200 });
  } catch (error: any) {
    console.error('Full error object:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ error: `Error setting thresholds: ${error.message}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}