import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractFunctionParameters, Hbar, HbarUnit } from "@hashgraph/sdk";
import { createServerSupabase } from '@/utils/supabase';
import { executeThresholdTrade } from '@/app/lib/threshold';
import { cookies } from 'next/headers';
import { awardThresholdExecutionXP } from '@/app/lib/rewards';

export async function POST(req: NextRequest) {
  let thresholdId: string | null = null;
  const cookieStore = cookies();
  
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { thresholdId: requestThresholdId, orderType } = await req.json();
    thresholdId = requestThresholdId;

    if (!thresholdId || !orderType) {
      return new NextResponse(
        JSON.stringify({ error: 'Threshold ID and order type are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get threshold data from Supabase
    const supabase = createServerSupabase(cookieStore, true);
    const { data: threshold, error: fetchError } = await supabase
      .from('Thresholds')
      .select('*')
      .eq('id', thresholdId)
      .single();

    if (fetchError || !threshold) {
      console.error('Threshold fetch error:', { thresholdId, error: fetchError });
      return new NextResponse(
        JSON.stringify({ error: 'Threshold not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Hedera client
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    // Determine trade direction and amount based on order type
    let fromToken, toToken, tradeAmount;
    if (orderType === 'buyOrder') {
      // For buy orders, we're trading token B for token A
      fromToken = threshold.tokenB;
      toToken = threshold.tokenA;
      tradeAmount = threshold.cap;
    } else {
      // For stop loss and sell orders, we're trading token A for token B
      fromToken = threshold.tokenA;
      toToken = threshold.tokenB;
      tradeAmount = threshold.cap;
    }

    console.log('Starting trade execution:', {
      thresholdId,
      orderType,
      fromToken,
      toToken,
      tradeAmount
    });

    // Execute trade with stored slippage
    let tradeResult;
    try {
      tradeResult = await executeThresholdTrade(
        orderType,
        {
          ...threshold,
          slippageBasisPoints: threshold.slippageBasisPoints || 50 // Use stored slippage or default
        },
        Buffer.from(threshold.path, 'hex')
      );
      console.log('Trade execution result:', { thresholdId, tradeResult });
    } catch (error: any) {
      console.error('Trade execution failed:', {
        thresholdId,
        error: error.message,
        step: 'executeThresholdTrade'
      });
      error.step = 'executeThresholdTrade';
      throw error;
    }

    // Create and execute contract transaction
    try {
      const contractExecuteTx = new ContractExecuteTransaction()
        .setContractId(process.env.CONTRACT_ADDRESS_HEDERA!)
        .setGas(3000000)
        .setFunction(
          "executeTradeForUser",
          new ContractFunctionParameters()
            .addString(threshold.hederaAccountId)
            .addString(orderType)
            .addBytes(Buffer.from(threshold.path, 'hex'))
        )
        .setPayableAmount(Hbar.from(tradeAmount, HbarUnit.Hbar));

      console.log('Executing contract transaction:', {
        thresholdId,
        contractId: process.env.CONTRACT_ADDRESS_HEDERA,
        hederaAccountId: threshold.hederaAccountId
      });

      const txResponse = await contractExecuteTx.execute(client);
      const receipt = await txResponse.getReceipt(client);

      console.log('Transaction receipt:', {
        thresholdId,
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString()
      });

      if (receipt.status.toString() !== "SUCCESS") {
        // Update threshold status to failed
        await supabase
          .from('Thresholds')
          .update({ 
            status: 'failed',
            lastError: `Transaction failed with status: ${receipt.status.toString()}`,
            lastChecked: new Date().toISOString()
          })
          .eq('id', thresholdId);

        return new NextResponse(
          JSON.stringify({ 
            error: `Transaction failed with status: ${receipt.status.toString()}`,
            details: {
              thresholdId,
              transactionId: txResponse.transactionId.toString(),
              status: receipt.status.toString()
            }
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
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
      console.error('Contract execution failed:', {
        thresholdId,
        error: error.message,
        step: 'contractExecution'
      });
      error.step = 'contractExecution';
      throw error;
    }

  } catch (error: any) {
    console.error('Order execution error:', {
      error: error.message,
      stack: error.stack,
      thresholdId,
      step: error.step || 'unknown',
      details: error.details || error.response?.data
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
        error: 'Order execution failed',
        details: {
          message: error.message,
          step: error.step || 'unknown',
          details: error.details || error.response?.data
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
