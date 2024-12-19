import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractFunctionParameters, Hbar, HbarUnit } from "@hashgraph/sdk";
import { createClient } from '@/utils/supabase/server';
import { executeThresholdTrade } from '@/app/lib/threshold';

export async function POST(req: NextRequest) {
  let thresholdId: string | null = null;
  
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
    const supabase = await createClient();
    const { data: threshold, error: fetchError } = await supabase
      .from('Thresholds')
      .select('*')
      .eq('id', thresholdId)
      .single();

    if (fetchError || !threshold) {
      return new NextResponse(
        JSON.stringify({ error: 'Threshold not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Hedera client
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
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

    // Execute trade with stored slippage
    const tradeResult = await executeThresholdTrade(
      orderType,
      {
        ...threshold,
        slippageBasisPoints: threshold.slippageBasisPoints || 50 // Use stored slippage or default
      },
      Buffer.from(threshold.path, 'hex')
    );

    // Create contract execute transaction with proper parameters
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

    // Execute contract transaction
    const txResponse = await contractExecuteTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

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
        JSON.stringify({ error: `Transaction failed with status: ${receipt.status.toString()}` }),
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

    return new NextResponse(
      JSON.stringify({
        message: `${orderType.toUpperCase()} order executed successfully!`,
        txHash: txResponse.transactionId.toString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // Update threshold status to failed if we have a thresholdId
    if (thresholdId) {
      const supabase = await createClient();
      await supabase
        .from('Thresholds')
        .update({ 
          status: 'failed',
          lastError: error.message,
          lastChecked: new Date().toISOString()
        })
        .eq('id', thresholdId);
    }

    return new NextResponse(
      JSON.stringify({ error: 'An unexpected error occurred during order execution' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
