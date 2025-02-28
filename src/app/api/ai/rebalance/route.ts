import { NextRequest, NextResponse } from 'next/server';
import { HederaAgentKit } from 'hedera-agent-kit';
import { TopicId } from "@hashgraph/sdk";

export async function GET(request: NextRequest) {
  try {
    // Initialize HederaAgentKit with operator credentials
    const kit = new HederaAgentKit(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      process.env.OPERATOR_KEY!,
      'testnet'
    );
    
    // Get rebalancing topic if it exists
    let topicId;
    let recentRecommendations = [];
    
    if (process.env.REBALANCING_TOPIC_ID) {
      topicId = TopicId.fromString(process.env.REBALANCING_TOPIC_ID);
      
      // Get recent messages
      const messages = await kit.getTopicMessages(topicId, 'testnet');
      
      // Parse recommendations
      recentRecommendations = messages
        .map(msg => {
          try {
            return JSON.parse(msg.message);
          } catch (e) {
            return null;
          }
        })
        .filter(msg => msg && msg.type === 'rebalance_recommendation')
        .slice(-5); // Get last 5 recommendations
    }
    
    // Current market conditions (in production, this would come from a price feed)
    const marketConditions = {
      prices: {
        hbar: 0.068,
        sauce: 0.0042,
        clxy: 0.0015
      },
      volatility: {
        hbar: 0.052,
        sauce: 0.127,
        clxy: 0.183
      },
      liquidity: {
        hbar: 1000000,
        sauce: 500000,
        clxy: 250000
      }
    };
    
    // Current ratios (in production, this would come from the contract)
    const currentRatios = {
      hbar: 0.33333,
      sauce: 0.33333,
      clxy: 0.33333
    };
    
    return NextResponse.json({
      currentRatios,
      marketConditions,
      recentRecommendations,
      topicId: topicId?.toString(),
      lastRebalanced: "2023-05-01" // In production, this would be the actual date
    });
    
  } catch (error: any) {
    console.error('Rebalancing data error:', error);
    return NextResponse.json(
      { error: `Failed to get rebalancing data: ${error.message}` },
      { status: 500 }
    );
  }
} 