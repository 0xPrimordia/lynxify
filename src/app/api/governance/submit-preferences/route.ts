// src/app/api/governance/submit-preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hcsGovernanceService } from '@/services/hcsService';

export async function POST(request: NextRequest) {
  try {
    const { userTopicId, userId, composition, lynxStake } = await request.json();
    
    // In a real implementation, verify the user has staked LYNX tokens
    // and that this is their topic
    
    // Submit and get the transaction ID
    const txId = await hcsGovernanceService.submitUserPreference(
      userTopicId,
      userId,
      composition,
      lynxStake
    );
    
    return NextResponse.json({
      success: true,
      message: 'Preference submitted successfully',
      transactionId: txId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error submitting preference:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}