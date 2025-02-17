import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase';
import { Client, ContractExecuteTransaction, PrivateKey, AccountId, ContractFunctionParameters, ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore);

    // Get user session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Auth error:', sessionError);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized', 
          details: sessionError?.message || 'No active session' 
        }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const { hederaAccountId, slippageBasisPoints } = body;
    
    console.log('Received request with body:', body);
    console.log('Looking for user with Hedera ID:', hederaAccountId);

    // Verify user owns this Hedera account
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('hedera_account_id', hederaAccountId)
      .single();

    if (userError || !user) {
      console.error('User verification error:', userError);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: 'Account not found or unauthorized'
        }),
        { status: 401 }
      );
    }

    // Create threshold record with slippage
    const { data: pendingThreshold, error: insertError } = await supabase
      .from('Thresholds')
      .insert({
        userId: user.id,
        ...body,
        slippageBasisPoints: slippageBasisPoints || 50, // Default to 0.5% if not provided
        isActive: false,
        status: 'pending',
        testnet: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'testnet',
        createdAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        lastExecutedAt: new Date().toISOString(),
        lastError: '',
        txHash: ''
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create threshold record:', insertError);
      return new NextResponse(
        JSON.stringify({ error: `Failed to create threshold record: ${insertError.message}` }),
        { status: 500 }
      );
    }

    // Initialize Hedera client
    console.log('Initializing Hedera client...');
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
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

    try {
      // Create contract execute transaction
      console.log('Creating contract transaction...');
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

      console.log('Executing contract transaction...');
      const txResponse = await contractExecuteTx.execute(client);
      console.log('Transaction submitted:', txResponse.transactionId.toString());

      const receipt = await txResponse.getReceipt(client);
      console.log('Transaction receipt:', {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString(),
        contractId: process.env.CONTRACT_ADDRESS_HEDERA
      });

      if (receipt.status.toString() !== "SUCCESS") {
        // Enhanced error logging for contract failure
        const errorDetails = {
          status: receipt.status.toString(),
          transactionId: txResponse.transactionId.toString(),
          contractParams: debugParams,
          timestamp: new Date().toISOString()
        };
        console.error('Contract transaction failed:', errorDetails);

        await supabase
          .from('Thresholds')
          .update({ 
            status: 'failed',
            lastError: JSON.stringify(errorDetails),
            lastChecked: new Date().toISOString()
          })
          .eq('id', pendingThreshold.id);

        return new NextResponse(
          JSON.stringify({ 
            error: `Contract transaction failed`,
            details: errorDetails,
            debugInfo: {
              requestBody: body,
              contractParams: debugParams,
              receipt: receipt
            }
          }),
          { status: 500 }
        );
      }

      // After successful contract execution
      console.log('Attempting database update for threshold:', {
        id: pendingThreshold.id,
        updatePayload: {
          isActive: true,
          status: 'active',
          txHash: txResponse.transactionId.toString(),
          lastChecked: new Date().toISOString()
        }
      });
      
      // First verify the threshold exists
      const { data: verifyData, error: verifyError } = await supabase
        .from('Thresholds')
        .select('*')
        .eq('id', pendingThreshold.id)
        .single();
        
      console.log('Verification check:', {
        found: !!verifyData,
        currentData: verifyData,
        error: verifyError
      });

      // Then attempt the update
      const { data: updateData, error: updateError } = await supabase
        .from('Thresholds')
        .update({ 
          isActive: true,
          status: 'active',
          txHash: txResponse.transactionId.toString(),
          lastChecked: new Date().toISOString()
        })
        .eq('id', pendingThreshold.id)
        .select('*');

      console.log('Update operation result:', {
        success: !!updateData && updateData.length > 0,
        updatedData: updateData,
        error: updateError,
        rowCount: updateData?.length || 0,
        thresholdId: pendingThreshold.id
      });

      return new NextResponse(
        JSON.stringify({
          message: 'Threshold set successfully',
          txHash: txResponse.transactionId.toString(),
          id: pendingThreshold.id
        }),
        { status: 200 }
      );

    } catch (error: any) {
      // Catch and log any unexpected errors during contract interaction
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        contractParams: debugParams,
        timestamp: new Date().toISOString()
      };
      console.error('Unexpected error during contract interaction:', errorDetails);

      await supabase
        .from('Thresholds')
        .update({ 
          status: 'failed',
          lastError: JSON.stringify(errorDetails),
          lastChecked: new Date().toISOString()
        })
        .eq('id', pendingThreshold.id);

      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to set threshold',
          details: errorDetails
        }),
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Threshold creation error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
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
