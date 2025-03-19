// src/app/api/governance/create-user-topic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hcsGovernanceService } from '@/services/hcsService';

export async function POST(request: NextRequest) {
  try {
    const { userId, publicKey, lynxStake } = await request.json();
    
    // In a real implementation, verify the user has staked LYNX tokens
    // For now, we'll assume they have
    
    const topicId = await hcsGovernanceService.createUserTopic(userId, publicKey);
    
    return NextResponse.json({
      success: true,
      topicId,
      userId
    });
  } catch (error: any) {
    console.error('Error creating user topic:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}