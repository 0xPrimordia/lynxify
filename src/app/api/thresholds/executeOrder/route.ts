import { ethers } from "ethers";
import abi from "../../../contracts/userThreshold.json";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Check for API key in the request headers
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { thresholdId, condition, currentPrice } = await req.json();

    if (!thresholdId) {
      return NextResponse.json({ error: 'Missing threshold ID' }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch the threshold from the database
    const { data: thresholdData, error: thresholdError } = await supabase
      .from('Thresholds')
      .select('*')
      .eq('id', thresholdId)
      .single();

    if (thresholdError || !thresholdData) {
      return NextResponse.json({ error: 'Threshold not found' }, { status: 404 });
    }

    // Double check the condition is still valid
    if (condition === 'buy' && currentPrice < thresholdData.buyOrder) {
      return NextResponse.json({ error: 'Buy condition no longer met' }, { status: 400 });
    }
    if (condition === 'sell' && currentPrice > thresholdData.stopLoss) {
      return NextResponse.json({ error: 'Stop loss condition no longer met' }, { status: 400 });
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL);

    // Use the authorized executor's private key to sign the transaction
    const executorPrivateKey = process.env.AUTHORIZED_EXECUTOR_PRIVATE_KEY;
    if (!executorPrivateKey) {
      throw new Error('Authorized executor private key not found');
    }
    const executorWallet = new ethers.Wallet(executorPrivateKey, provider);

    // Initialize contract with the executor's wallet
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS as string, abi, executorWallet);

    try {
      const orderType = condition === 'sell' ? 'stopLoss' : 'buyOrder';
      
      // Construct the path
      const path = ethers.solidityPacked(
        ['address', 'uint24', 'address'],
        [thresholdData.tokenA, thresholdData.fee, thresholdData.tokenB]
      );

      // Execute the trade
      const tx = await contract.executeTradeForUser(thresholdData.user_id, orderType, path);
      await tx.wait();

      // Update the threshold in the database
      const { error: updateError } = await supabase
        .from('Thresholds')
        .update({ 
          isActive: false,
          status: 'executed',
          lastChecked: new Date().toISOString()
        })
        .eq('id', thresholdId);

      if (updateError) {
        console.error('Error updating threshold:', updateError);
        // Continue execution as the trade was successful
      }

      return NextResponse.json({ 
        message: `${orderType.toUpperCase()} order executed successfully!`,
        txHash: tx.hash 
      });
    } catch (error: any) {
      console.error('Contract interaction error:', error);
      
      // Update threshold status to failed
      await supabase
        .from('Thresholds')
        .update({ 
          status: 'failed',
          lastError: error.message,
          lastChecked: new Date().toISOString()
        })
        .eq('id', thresholdId);

      return NextResponse.json({ error: `Error executing order: ${error.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
