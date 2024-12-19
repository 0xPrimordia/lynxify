import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractFunctionParameters, ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    // Get the request body first
    const body = await req.json();
    const { hederaAccountId } = body;
    
    console.log('Received request with body:', body);
    console.log('Looking for user with Hedera ID:', hederaAccountId);

    // Use service client directly to find user by Hedera ID
    const serviceClient = createServiceRoleClient();
    
    // Find user by Hedera account ID first
    const { data: dbUser, error: userError } = await serviceClient
      .from('Users')
      .select('*')
      .eq('hederaAccountId', hederaAccountId)
      .single();

    if (!dbUser) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'User not found',
          hederaAccountId,
          queryError: userError,
          requestBody: body
        }),
        { status: 404 }
      );
    }

    // Create threshold record in database first
    const { data: pendingThreshold, error: insertError } = await serviceClient
      .from('Thresholds')
      .insert({
        userId: dbUser.id,
        ...body,
        isActive: false,
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        lastExecutedAt: new Date().toISOString(),
        lastError: '',
        txHash: ''
      })
      .select()
      .single();

    if (insertError) {
      return new NextResponse(
        JSON.stringify({ error: `Failed to create threshold record: ${insertError.message}` }),
        { status: 500 }
      );
    }

    // Initialize Hedera client
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    // Modified price conversion with bounds checking
    const priceBasisPoints = Math.max(1, Math.min(10000, Math.floor(body.price * 10000)));
    const formattedCap = ethers.parseUnits(body.cap.toString(), 18);
    
    // Convert token IDs to solidity addresses
    const tokenAAddress = `0x${ContractId.fromString(body.tokenA).toSolidityAddress()}`;
    const tokenBAddress = `0x${ContractId.fromString(body.tokenB).toSolidityAddress()}`;

    // Add debug logging for contract parameters
    const debugParams = {
      priceBasisPoints,
      formattedCap: formattedCap.toString(),
      tokenAAddress,
      tokenBAddress,
      hederaAccountId
    };
    console.log('Contract parameters:', debugParams);

    // Create contract execute transaction
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(process.env.CONTRACT_ADDRESS_HEDERA!))
      .setGas(1000000)
      .setFunction(
        "setThreshold",
        new ContractFunctionParameters()
          .addUint256(priceBasisPoints)
          .addString(hederaAccountId)
          .addAddress(tokenAAddress)
          .addAddress(tokenBAddress)
          .addUint256(formattedCap.toString())
      );

    const txResponse = await contractExecuteTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
      // If contract fails, update database record to failed
      await serviceClient
        .from('Thresholds')
        .update({ 
          status: 'failed',
          lastError: `Contract transaction failed: ${receipt.status.toString()}`
        })
        .eq('id', pendingThreshold.id);

      return new NextResponse(
        JSON.stringify({ 
          error: `Contract transaction failed with status: ${receipt.status.toString()}`,
          debugInfo: {
            requestBody: body,
            contractParams: debugParams,
            receipt: receipt
          }
        }),
        { status: 500 }
      );
    }

    // If successful, update the threshold record with transaction info
    const { error: updateError } = await serviceClient
      .from('Thresholds')
      .update({ 
        isActive: true,
        status: 'active',
        txHash: txResponse.transactionId.toString(),
        lastChecked: new Date().toISOString()
      })
      .eq('id', pendingThreshold.id);

    if (updateError) {
      console.error('Failed to update threshold record:', updateError);
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Threshold set successfully',
        txHash: txResponse.transactionId.toString(),
        id: pendingThreshold.id
      }),
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error in setThresholds:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to set thresholds', 
        details: error.message,
        debugInfo: {
          errorName: error.name,
          errorStack: error.stack,
          errorMessage: error.message
        }
      }),
      { status: 500 }
    );
  }
}

// Keep other HTTP method handlers
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
