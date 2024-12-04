import { ethers } from "ethers";
import abi from "../../../contracts/userThreshold.json";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';

// Add ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

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

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL);

    // Check balances and allowances before proceeding
    try {
      const { hasBalance, hasAllowance, requiredAmount } = await checkBalanceAndAllowance(
        provider,
        condition === 'sell' ? thresholdData.tokenA : thresholdData.tokenB,
        thresholdData.user_id,
        condition === 'sell' ? thresholdData.stopLossCap : thresholdData.buyOrderCap,
        process.env.CONTRACT_ADDRESS as string
      );

      if (!hasBalance) {
        return NextResponse.json({ 
          error: 'Insufficient balance for trade execution',
          details: `Required: ${requiredAmount}`
        }, { status: 400 });
      }

      if (!hasAllowance) {
        return NextResponse.json({ 
          error: 'Insufficient allowance for trade execution',
          details: `Required: ${requiredAmount}`
        }, { status: 400 });
      }
    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Error checking balance/allowance',
        details: error.message 
      }, { status: 500 });
    }

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

async function checkBalanceAndAllowance(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  userAddress: string,
  amount: number,
  contractAddress: string
): Promise<{ 
  hasBalance: boolean; 
  hasAllowance: boolean;
  requiredAmount: string;
}> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    
    // Convert amount to token units
    const requiredAmount = ethers.parseUnits(amount.toString(), decimals);
    
    // Check balance
    const balance = await tokenContract.balanceOf(userAddress);
    const hasBalance = balance >= requiredAmount;
    
    // Check allowance
    const allowance = await tokenContract.allowance(userAddress, contractAddress);
    const hasAllowance = allowance >= requiredAmount;

    return {
      hasBalance,
      hasAllowance,
      requiredAmount: ethers.formatUnits(requiredAmount, decimals)
    };
  } catch (error: any) {
    throw new Error(`Failed to check balance/allowance: ${error.message}`);
  }
}

async function validateTradeExecution(
  thresholdId: string, 
  condition: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
) {
  const { data, error } = await supabase
    .from('Thresholds')
    .select('lastExecutedAt, status, isActive')
    .eq('id', thresholdId)
    .single();
    
  if (error) {
    throw new Error('Failed to validate trade');
  }

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
