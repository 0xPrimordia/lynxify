// src/app/api/governance/get-consensus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hcsGovernanceService } from '@/services/hcsService';

export async function GET(request: NextRequest) {
  try {
    // Try to get real consensus data
    const consensus = await hcsGovernanceService.calculateConsensus();
    
    // If no consensus data is available yet, provide mock data
    if (!consensus) {
      const mockConsensusData = {
        sectors: {
          "Native Token": {
            selectedToken: "HBAR",
            tokens: ["HBAR"],
            allocations: { "HBAR": 22 }
          },
          "Layer 1": {
            selectedToken: "WBTC",
            tokens: ["WETH", "WBTC", "WSOL", "WAVAX"],
            allocations: { "WETH": 12, "WBTC": 13, "WSOL": 5, "WAVAX": 3 }
          },
          "Liquid Staking": {
            selectedToken: "HBARX",
            tokens: ["HBARX", "xSAUCE"],
            allocations: { "HBARX": 12, "xSAUCE": 3 }
          },
          "DeFi": {
            selectedToken: "SAUCE",
            tokens: ["SAUCE", "HLQT", "SGB"],
            allocations: { "SAUCE": 8, "HLQT": 6, "SGB": 3 }
          },
          "Stablecoins": {
            selectedToken: "USDC",
            tokens: ["USDC", "USDT", "DAI", "HCHF", "BUSD"],
            allocations: { "USDC": 8, "USDT": 3, "DAI": 2, "HCHF": 0, "BUSD": 0 }
          },
          "Ecosystem": {
            selectedToken: "CLXY",
            tokens: ["CLXY", "DOVU", "HST", "HBAR+", "ATMA"],
            allocations: { "CLXY": 3, "DOVU": 0, "HST": 0, "HBAR+": 0, "ATMA": 0 }
          }
        }
      };
      
      return NextResponse.json({
        success: true,
        consensus: mockConsensusData,
        lastUpdated: new Date().toISOString(),
        isMockData: true
      });
    }
    
    // Return the real consensus data
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