// src/app/api/governance/schedule-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scheduledTransactionService } from '@/services/scheduledTransactionService';
import { hcsGovernanceService } from '@/services/hcsService';

export async function POST(request: NextRequest) {
  try {
    const { composition, transitionDays = 7, gradual = true } = await request.json();
    
    // Get current composition
    const currentConsensus = await hcsGovernanceService.calculateConsensus();
    
    let scheduleIds: string[];
    
    if (gradual) {
      // Schedule gradual transition
      scheduleIds = await scheduledTransactionService.scheduleGradualTransition(
        currentConsensus,
        composition,
        transitionDays
      );
    } else {
      // Schedule immediate update
      const executionTime = new Date();
      executionTime.setDate(executionTime.getDate() + 1); // 1 day from now
      
      const scheduleId = await scheduledTransactionService.scheduleCompositionUpdate(
        composition,
        executionTime
      );
      
      scheduleIds = [scheduleId];
    }
    
    return NextResponse.json({
      success: true,
      scheduleIds,
      message: gradual 
        ? `Scheduled gradual transition over ${transitionDays} days` 
        : 'Scheduled immediate update for tomorrow'
    });
  } catch (error: any) {
    console.error('Error scheduling update:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}