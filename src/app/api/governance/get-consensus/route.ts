// src/app/api/governance/get-consensus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hcsGovernanceService } from '@/services/hcsService';

export async function GET(request: NextRequest) {
  try {
    const consensus = await hcsGovernanceService.calculateConsensus();
    
    return NextResponse.json({
      success: true,
      consensus,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting consensus:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}