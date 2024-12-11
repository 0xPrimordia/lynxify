import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId } from "@hashgraph/sdk";
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  let thresholdId: string | null = null;
  
  try {
    const { thresholdId: requestThresholdId, orderType } = await req.json();
    thresholdId = requestThresholdId;

    if (!thresholdId || !orderType) {
      return new NextResponse(
        JSON.stringify({ error: 'Threshold ID and order type are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = await createClient();
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    // Create contract execute transaction
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(process.env.CONTRACT_ADDRESS_HEDERA!)
      .setGas(1000000);

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
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update database status
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
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
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
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
