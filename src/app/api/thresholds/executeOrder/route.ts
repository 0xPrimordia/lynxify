import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractId, Hbar, TransactionId, ContractFunctionParameters } from "@hashgraph/sdk";
import { ethers } from 'ethers';
import { createServerSupabase } from '@/utils/supabase';
import { executeThresholdTrade } from '@/app/lib/threshold';
import { cookies } from 'next/headers';
import { awardThresholdExecutionXP } from '@/app/lib/rewards';
import { WHBAR_ID, SWAP_ROUTER_ADDRESS } from '@/app/lib/constants';
import { hexToUint8Array } from '@/app/lib/utils/format';
import SwapRouterAbi from '@/app/lib/abis/SwapRouter.json';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

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
      toToken = WHBAR_ID;
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

    // Construct path for the swap
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(fromToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(threshold.fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(toToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // Create and execute contract transaction using our contract
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(process.env.CONTRACT_ADDRESS_HEDERA!)
      .setGas(5000000)
      .setFunction(
        "executeTradeForUser",
        new ContractFunctionParameters()
          .addString(threshold.hederaAccountId)
          .addString(orderType)
          .addBytes(path)
      )
      .setPayableAmount(orderType === 'buyOrder' ? new Hbar(tradeAmount.toString()) : new Hbar(0));

    console.log('[executeOrder] Executing transaction:', {
      thresholdId,
      orderType,
      fromToken,
      toToken,
      tradeAmount: tradeAmount.toString(),
      pathHex: path.toString('hex'),
      recipient: threshold.hederaAccountId
    });

    const txResponse = await contractExecuteTx.execute(client);
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

    // Update threshold status to failed if we have a thresholdId
    if (thresholdId) {
      const supabase = createServerSupabase(cookieStore, true);
      await supabase
        .from('Thresholds')
        .update({ 
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
