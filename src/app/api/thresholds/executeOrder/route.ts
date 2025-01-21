import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractId, Hbar, TransactionId } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { cookies } from 'next/headers';
import { awardThresholdExecutionXP } from '@/app/lib/rewards';
import { WHBAR_ID } from '@/app/lib/constants';
import { swapHbarToToken } from '@/app/lib/trades/hbarToToken';
import { swapTokenToHbar } from '@/app/lib/trades/tokenToHbar';
import { swapTokenToToken } from '@/app/lib/trades/tokenToToken';
import { Transaction } from '@hashgraph/sdk';

export async function POST(req: NextRequest) {
  let thresholdId: string | null = null;
  const cookieStore = cookies();
  
  console.log('[executeOrder] Request received');
  
  try {
    // First try-catch block just for parsing the request
    let body;
    try {
      body = await req.json();
      console.log('[executeOrder] Request body parsed:', body);
    } catch (error: any) {
      console.error('[executeOrder] Failed to parse request body:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // API key verification
    const apiKey = req.headers.get('x-api-key');
    console.log('[executeOrder] API key check:', {
      hasKey: !!apiKey,
      keyMatch: apiKey === process.env.API_KEY,
      envKeyExists: !!process.env.API_KEY
    });

    if (!apiKey || apiKey !== process.env.API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { thresholdId: requestThresholdId, orderType } = body;
    thresholdId = requestThresholdId;

    // Get threshold data from Supabase
    console.log('[executeOrder] Fetching threshold data:', { thresholdId });
    const supabase = createServerSupabase(cookieStore, true);
    const { data: threshold, error: fetchError } = await supabase
      .from('Thresholds')
      .select('*')
      .eq('id', thresholdId)
      .single();

    if (fetchError || !threshold) {
      console.error('[executeOrder] Threshold fetch error:', { thresholdId, error: fetchError });
      return new NextResponse(
        JSON.stringify({ error: 'Threshold not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!threshold.tokenA || !threshold.tokenB || !threshold.fee) {
      console.error('[executeOrder] Missing required swap parameters:', { 
        thresholdId,
        hasTokenA: !!threshold.tokenA,
        hasTokenB: !!threshold.tokenB,
        hasFee: !!threshold.fee
      });
      return new NextResponse(
        JSON.stringify({ error: 'Invalid threshold configuration: missing required swap parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Hedera client
    console.log('[executeOrder] Initializing Hedera client');
    const client = Client.forTestnet();
    
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
      console.error('[executeOrder] Missing Hedera credentials');
      return new NextResponse(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID),
      PrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    // Determine trade direction and amount
    let fromToken, toToken, tradeAmount;
    if (orderType === 'buyOrder') {
      fromToken = WHBAR_ID;
      toToken = threshold.tokenA;
      tradeAmount = threshold.cap;
    } else if (orderType === 'sellOrder') {
      fromToken = threshold.tokenA;
      toToken = threshold.tokenB;
      tradeAmount = threshold.cap;
    } else if (orderType === 'stopLoss') {
      fromToken = threshold.tokenA;
      toToken = threshold.tokenB;
      tradeAmount = threshold.cap;
    } else {
      console.error('[executeOrder] Invalid order type:', { orderType, thresholdId });
      return new NextResponse(
        JSON.stringify({ error: 'Invalid order type' }),
        { status: 400 }
      );
    }

    let txResponse;
    if (fromToken === WHBAR_ID) {
      const result = await swapHbarToToken(
        tradeAmount.toString(),
        toToken,
        threshold.fee,
        threshold.hederaAccountId,
        Math.floor(Date.now() / 1000) + 60,
        50, // 0.5% slippage
        threshold.tokenBDecimals || 8
      );
      const tx = Transaction.fromBytes(Buffer.from(result.tx, 'base64'));
      txResponse = await tx.execute(client);
    } else if (toToken === WHBAR_ID) {
      const result = await swapTokenToHbar(
        tradeAmount.toString(),
        fromToken,
        threshold.fee,
        threshold.hederaAccountId,
        Math.floor(Date.now() / 1000) + 60,
        50, // 0.5% slippage
        threshold.tokenADecimals || 8
      );
      const tx = Transaction.fromBytes(Buffer.from(result.tx, 'base64'));
      txResponse = await tx.execute(client);
    } else {
      const result = await swapTokenToToken(
        tradeAmount.toString(),
        fromToken,
        toToken,
        threshold.fee,
        threshold.hederaAccountId,
        Math.floor(Date.now() / 1000) + 60,
        50, // 0.5% slippage
        threshold.tokenADecimals || 8,
        threshold.tokenBDecimals || 8
      );
      const tx = Transaction.fromBytes(Buffer.from(result.tx, 'base64'));
      txResponse = await tx.execute(client);
    }

    console.log('[executeOrder] Transaction submitted:', {
      thresholdId,
      transactionId: txResponse.transactionId.toString()
    });

    const receipt = await txResponse.getReceipt(client);
    console.log('[executeOrder] Transaction receipt:', {
      thresholdId,
      status: receipt.status.toString(),
      transactionId: txResponse.transactionId.toString()
    });

    if (receipt.status.toString() !== "SUCCESS") {
      throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
    }

    // Update database status on success
    await supabase
      .from('Thresholds')
      .update({ 
        isActive: false,
        status: 'executed',
        lastChecked: new Date().toISOString(),
        lastExecutedAt: new Date().toISOString(),
        txHash: txResponse.transactionId.toString()
      })
      .eq('id', thresholdId);

    // Award XP after successful execution
    await awardThresholdExecutionXP(threshold.user_id, threshold.hederaAccountId);

    return new NextResponse(
      JSON.stringify({
        message: `${orderType.toUpperCase()} order executed successfully!`,
        txHash: txResponse.transactionId.toString(),
        details: {
          thresholdId,
          transactionId: txResponse.transactionId.toString(),
          status: receipt.status.toString()
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[executeOrder] Unhandled error:', {
      error: error.message,
      stack: error.stack,
      thresholdId
    });

    // Update threshold status to failed and set isActive to false
    if (thresholdId) {
      const supabase = createServerSupabase(cookieStore, true);
      await supabase
        .from('Thresholds')
        .update({ 
          isActive: false,
          status: 'failed',
          lastError: JSON.stringify({
            message: error.message,
            step: error.step || 'unknown',
            details: error.details || error.response?.data
          }),
          lastChecked: new Date().toISOString()
        })
        .eq('id', thresholdId);
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: {
          message: error.message,
          thresholdId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
