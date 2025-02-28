import { NextRequest, NextResponse } from 'next/server';
import { HCSService } from '@/services/hcsService';

export async function POST(request: NextRequest) {
  try {
    const { requestId, previousRatios, newRatios, confidence, reasoning } = await request.json();
    
    // Validate input
    if (!requestId || !previousRatios || !newRatios) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Validate that ratios sum to 1
    const previousSum = Object.values(previousRatios as Record<string, number>).reduce((a, b) => a + b, 0);
    const newSum = Object.values(newRatios as Record<string, number>).reduce((a, b) => a + b, 0);
    
    if (Math.abs(previousSum - 1) > 0.01 || Math.abs(newSum - 1) > 0.01) {
      return NextResponse.json(
        { error: 'Ratios must sum to 1' },
        { status: 400 }
      );
    }

    // Get environment variables
    const REBALANCING_TOPIC_ID = process.env.LYNX_REBALANCING_TOPIC_ID;
    const OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID;
    const OPERATOR_KEY = process.env.OPERATOR_KEY;

    // Validate required environment variables
    if (!REBALANCING_TOPIC_ID || !OPERATOR_ID || !OPERATOR_KEY) {
      return NextResponse.json(
        { error: 'Required environment variables not configured' },
        { status: 500 }
      );
    }
    
    // Initialize HCS service inside the function so it can be properly mocked
    const hcsService = new HCSService({
      operatorId: OPERATOR_ID,
      operatorKey: OPERATOR_KEY,
      network: 'testnet'
    });
    
    // Record the execution on HCS
    const executionData = {
      type: 'REBALANCE_EXECUTION',
      requestId,
      timestamp: new Date().toISOString(),
      previousRatios,
      newRatios,
      confidence,
      reasoning,
      executor: OPERATOR_ID // In a real app, this would be the user's account ID
    };
    
    const txId = await hcsService.submitMessage(REBALANCING_TOPIC_ID, executionData);
    
    return NextResponse.json({
      success: true,
      transactionId: txId,
      newRatios,
      timestamp: executionData.timestamp
    });
    
  } catch (error: any) {
    console.error('Error in rebalance execution:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 