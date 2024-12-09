import { ethers } from "ethers";
import abi from "../../../contracts/userThreshold.json";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { ContractId, AccountId, PrivateKey, Client, ContractExecuteTransaction, ContractFunctionParameters } from "@hashgraph/sdk";

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

    // Add validation check before proceeding
    try {
      await validateTradeExecution(thresholdId, condition, supabase);
    } catch (validationError: any) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

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

    // Initialize Hedera client
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    try {
      const orderType = condition === 'sell' ? 'stopLoss' : 'buyOrder';
      
      // Convert token addresses to bytes
      const tokenAAddress = ContractId.fromString(thresholdData.tokenA).toSolidityAddress();
      const tokenBAddress = ContractId.fromString(thresholdData.tokenB).toSolidityAddress();
      
      // Create path bytes manually
      const path = Buffer.concat([
        Buffer.from(tokenAAddress.replace('0x', ''), 'hex'),
        Buffer.from(thresholdData.fee.toString(16).padStart(6, '0'), 'hex'),
        Buffer.from(tokenBAddress.replace('0x', ''), 'hex')
      ]);

      console.log('Executing trade with params:', {
        hederaAccountId: thresholdData.hederaAccountId,
        orderType,
        path: path.toString('hex')
      });

      const contractExecuteTx = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(process.env.CONTRACT_ADDRESS_HEDERA!))
          .setGas(1000000)
          .setFunction("executeTradeForUser", new ContractFunctionParameters()
              .addString(thresholdData.hederaAccountId)  // Pass raw Hedera ID
              .addString(orderType)
              .addBytes(path)
          );

      const txResponse = await contractExecuteTx.execute(client);
      const receipt = await txResponse.getReceipt(client);

      if (receipt.status.toString() !== "SUCCESS") {
        throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
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

      return NextResponse.json({ 
        message: `${orderType.toUpperCase()} order executed successfully!`,
        txHash: txResponse.transactionId.toString() 
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

async function validateTradeExecution(
  thresholdId: string, 
  condition: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
) {
  console.log('Validating trade execution:', { thresholdId, condition });
  
  const { data, error } = await supabase
    .from('Thresholds')
    .select('lastExecutedAt, status, isActive')
    .eq('id', thresholdId)
    .single();
    
  if (error) {
    console.error('Validation query error:', error);
    throw new Error(`Failed to validate trade: ${error.message}`);
  }

  console.log('Validation data:', data);

  if (!data.isActive) {
    throw new Error('Threshold is not active');
  }
  
  // Prevent duplicate executions within 5 minutes
  if (data.lastExecutedAt) {
    const lastExecution = new Date(data.lastExecutedAt).getTime();
    const timeSinceLastExecution = Date.now() - lastExecution;
    if (timeSinceLastExecution < 5 * 60 * 1000) { // 5 minutes in milliseconds
      throw new Error('Trade recently executed');
    }
  }
  
  if (data.status === 'executing') {
    throw new Error('Trade already in progress');
  }

  // Update status to executing
  const { error: updateError } = await supabase
    .from('Thresholds')
    .update({ 
      status: 'executing',
      lastChecked: new Date().toISOString()
    })
    .eq('id', thresholdId);

  if (updateError) {
    throw new Error('Failed to update threshold status');
  }
  
  return true;
}
