import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, this would fetch data from your backend services
    // For now, we'll return mock data
    
    const dashboardData = {
      currentComposition: {
        hbar: 0.33333,
        sauce: 0.33333,
        clxy: 0.33333
      },
      rebalancing: {
        nextScheduled: "2023-07-15",
        aiConfidence: 0.87,
        marketVolatility: "moderate"
      },
      proposals: {
        active: 5,
        needsVote: 2,
        yourVotingPower: 1250
      }
    };
    
    return NextResponse.json(dashboardData);
    
  } catch (error: any) {
    console.error('Governance dashboard error:', error);
    return NextResponse.json(
      { error: `Failed to get governance dashboard data: ${error.message}` },
      { status: 500 }
    );
  }
} 