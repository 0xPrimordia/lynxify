import { NextRequest, NextResponse } from 'next/server';
import { HcsGovernanceService } from '@/services/hcsService';

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

    // Validate required environment variables
    if (!REBALANCING_TOPIC_ID) {
      return NextResponse.json(
        { error: 'Required environment variables not configured' },
        { status: 500 }
      );
    }
    
    // Initialize HCS service
    const hcsService = new HcsGovernanceService();
    
    // Record the execution on HCS
    const executionData = {
      type: 'REBALANCE_EXECUTION',
      requestId,
      timestamp: new Date().toISOString(),
      previousRatios,
      newRatios,
      confidence,
      reasoning
    };

    await hcsService.submitTopicMessage(REBALANCING_TOPIC_ID, JSON.stringify(executionData));

    return NextResponse.json({
      success: true,
      transactionId: 'mock-transaction-id', // Replace with actual transaction ID
      newRatios
    });
  } catch (error: any) {
    console.error('Error executing rebalance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 