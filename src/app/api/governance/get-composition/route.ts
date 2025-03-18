// src/app/api/governance/get-composition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hcsGovernanceService } from '@/services/hcsService';

export async function GET(request: NextRequest) {
  try {
    // For now, we'll return mock data
    // In a production app, this would fetch from a database or calculate from HCS messages
    
    const mockCompositionData = {
      currentComposition: {
        sectors: {
          "Native Token": {
            selectedToken: "HBAR",
            tokens: ["HBAR"],
            allocations: { "HBAR": 20 }
          },
          "Layer 1": {
            selectedToken: "WETH",
            tokens: ["WETH", "WBTC", "WSOL", "WAVAX"],
            allocations: { "WETH": 15, "WBTC": 10, "WSOL": 5, "WAVAX": 5 }
          },
          "Liquid Staking": {
            selectedToken: "HBARX",
            tokens: ["HBARX", "xSAUCE"],
            allocations: { "HBARX": 10, "xSAUCE": 5 }
          },
          "DeFi": {
            selectedToken: "SAUCE",
            tokens: ["SAUCE", "HLQT", "SGB"],
            allocations: { "SAUCE": 10, "HLQT": 5, "SGB": 5 }
          },
          "Stablecoins": {
            selectedToken: "USDC",
            tokens: ["USDC", "USDT", "DAI", "HCHF", "BUSD"],
            allocations: { "USDC": 10, "USDT": 5, "DAI": 5, "HCHF": 0, "BUSD": 0 }
          },
          "Ecosystem": {
            selectedToken: "CLXY",
            tokens: ["CLXY", "DOVU", "HST", "HBAR+", "ATMA"],
            allocations: { "CLXY": 5, "DOVU": 0, "HST": 0, "HBAR+": 0, "ATMA": 0 }
          }
        }
      },
      aiRecommendation: {
        sectors: {
          "Native Token": {
            selectedToken: "HBAR",
            tokens: ["HBAR"],
            allocations: { "HBAR": 25 }
          },
          "Layer 1": {
            selectedToken: "WBTC",
            tokens: ["WETH", "WBTC", "WSOL", "WAVAX"],
            allocations: { "WETH": 10, "WBTC": 15, "WSOL": 5, "WAVAX": 0 }
          },
          "Liquid Staking": {
            selectedToken: "HBARX",
            tokens: ["HBARX", "xSAUCE"],
            allocations: { "HBARX": 15, "xSAUCE": 0 }
          },
          "DeFi": {
            selectedToken: "SAUCE",
            tokens: ["SAUCE", "HLQT", "SGB"],
            allocations: { "SAUCE": 10, "HLQT": 5, "SGB": 0 }
          },
          "Stablecoins": {
            selectedToken: "USDC",
            tokens: ["USDC", "USDT", "DAI", "HCHF", "BUSD"],
            allocations: { "USDC": 10, "USDT": 5, "DAI": 0, "HCHF": 0, "BUSD": 0 }
          },
          "Ecosystem": {
            selectedToken: "CLXY",
            tokens: ["CLXY", "DOVU", "HST", "HBAR+", "ATMA"],
            allocations: { "CLXY": 0, "DOVU": 0, "HST": 0, "HBAR+": 0, "ATMA": 0 }
          }
        },
        reasoning: "Based on current market conditions, we recommend increasing HBAR allocation to 25% due to strong network growth. WBTC is preferred over WETH in the current market cycle. HBARX shows strong yield potential, warranting increased allocation. Stablecoins remain important for portfolio stability."
      }
    };
    
    return NextResponse.json(mockCompositionData);
    
  } catch (error: any) {
    console.error('Error getting composition data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}