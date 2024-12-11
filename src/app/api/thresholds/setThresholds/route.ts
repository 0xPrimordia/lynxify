export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractFunctionParameters, ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Get the Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Verify the JWT and get user data
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Received request body:', body);

    // Verify that the userId in the request matches the authenticated user
    if (body.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const { 
      stopLoss, 
      buyOrder, 
      stopLossCap, 
      buyOrderCap, 
      hederaAccountId, 
      tokenA,
      tokenB,
      fee,
      poolId,
      userId 
    } = body;

    console.log('Parsed request values:', {
      stopLoss, 
      buyOrder, 
      stopLossCap, 
      buyOrderCap,
      hederaAccountId, 
      tokenA,
      tokenB,
      fee,
      poolId,
      userId
    });

    // Initialize Hedera client
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    try {
      // Convert price thresholds to basis points
      const stopLossBasisPoints = Math.floor(stopLoss * 10000);
      const buyOrderBasisPoints = Math.floor(buyOrder * 10000);
      
      // Convert amounts to wei (using 6 decimals for SAUCE token)
      const stopLossAmount = ethers.parseUnits(stopLossCap.toString(), 6);
      const buyOrderAmount = ethers.parseUnits(buyOrderCap.toString(), 6);

      // Convert token ID to EVM address
      const tokenAddress = `0x${ContractId.fromString(tokenA).toSolidityAddress()}`;

      console.log('Setting thresholds in contract with params:', {
        stopLossBasisPoints,
        buyOrderBasisPoints,
        hederaAccountId,
        tokenAddress,
        stopLossAmount: stopLossAmount.toString(),
        buyOrderAmount: buyOrderAmount.toString()
      });

      // FIRST: Set thresholds in the contract
      const contractExecuteTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(process.env.CONTRACT_ADDRESS_HEDERA!))
        .setGas(1000000)
        .setFunction("setThresholds", new ContractFunctionParameters()
          .addUint256(stopLossBasisPoints)
          .addUint256(buyOrderBasisPoints)
          .addString(hederaAccountId)
          .addAddress(tokenAddress)
          .addUint256(stopLossAmount.toString())
          .addUint256(buyOrderAmount.toString())
        );

      console.log('Executing contract transaction...');
      const txResponse = await contractExecuteTx.execute(client);
      const receipt = await txResponse.getReceipt(client);

      if (receipt.status.toString() !== "SUCCESS") {
        throw new Error(`Contract transaction failed with status: ${receipt.status.toString()}`);
      }

      console.log('Contract thresholds set successfully, storing in Supabase...');

      // SECOND: After successful contract execution, store in Supabase
      const { data: threshold, error: insertError } = await supabase
        .from('Thresholds')
        .insert([{
          userId: user.id,
          hederaAccountId,
          tokenA,
          tokenB,
          fee,
          stopLoss,
          buyOrder,
          stopLossCap,
          buyOrderCap,
          isActive: true,
          txHash: txResponse.transactionId.toString()
        }])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to store threshold in database: ${insertError.message}`);
      }

      return NextResponse.json({ 
        message: 'Thresholds set successfully!',
        txHash: txResponse.transactionId.toString(),
        id: threshold.id
      });

    } catch (error: any) {
      console.error('Error setting thresholds:', error);
      return NextResponse.json({ error: `Failed to set thresholds: ${error.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
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

console.log('Operator Account:', process.env.OPERATOR_ID);
console.log('Contract ID:', ContractId.fromString('0.0.4965421').toString());
