import { NextRequest, NextResponse } from 'next/server';
import { HederaAgentKit } from 'hedera-agent-kit';
import { TopicId } from "@hashgraph/sdk";
import OpenAI from 'openai';

// This is a server-side API route that can use Node.js modules safely
export async function POST(request: NextRequest) {
  try {
    const { amount, userPreferences, marketConditions } = await request.json();
    
    // Initialize HederaAgentKit with operator credentials
    const kit = new HederaAgentKit(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      process.env.OPERATOR_KEY!,
      'testnet'
    );
    
    // Get or create topic
    let topicId;
    if (process.env.ANALYSIS_TOPIC_ID) {
      topicId = TopicId.fromString(process.env.ANALYSIS_TOPIC_ID);
    } else {
      const topicResult = await kit.createTopic("LYNX AI Analysis", true);
      topicId = TopicId.fromString(topicResult.topicId);
      console.log("Created new topic:", topicResult.topicId);
    }
    
    // Submit analysis request to HCS
    const requestId = `mint-${Date.now()}`;
    await kit.submitTopicMessage(
      topicId,
      JSON.stringify({
        type: 'mint_request',
        timestamp: Date.now(),
        data: {
          requestId,
          amount,
          marketConditions,
          userPreferences
        }
      })
    );
    
    // Get recent messages for analysis
    const messages = await kit.getTopicMessages(topicId, 'testnet');
    
    // Prepare historical data for AI analysis
    const historicalRequests = messages
      .map(msg => {
        try {
          return JSON.parse(msg.message);
        } catch (e) {
          return null;
        }
      })
      .filter(msg => msg && msg.type === 'mint_request')
      .slice(-10); // Get last 10 requests
    
    // Use OpenAI to analyze the data and recommend ratios
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI financial advisor specializing in cryptocurrency portfolio optimization. 
          Your task is to analyze market data and recommend optimal token ratios for minting a tokenized index.`
        },
        {
          role: "user",
          content: `Based on the following data, recommend optimal ratios for HBAR, SAUCE, and CLXY tokens for minting LYNX:
          
          User preferences: ${JSON.stringify(userPreferences)}
          Current market conditions: ${JSON.stringify(marketConditions)}
          Historical requests: ${JSON.stringify(historicalRequests)}
          
          Provide your response in JSON format with the following structure:
          {
            "ratios": {
              "hbar": number, // between 0 and 1
              "sauce": number, // between 0 and 1
              "clxy": number // between 0 and 1
            },
            "confidence": number, // between 0 and 1
            "reasoning": string[], // array of reasoning statements
            "volatilityTrend": "increasing" | "decreasing" | "stable",
            "liquidityTrend": "improving" | "worsening" | "stable"
          }
          
          The sum of all ratios should equal 1.`
        }
      ]
    });
    
    // Parse the AI response
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }
    const aiResponse = JSON.parse(content);
    
    // Submit AI recommendation back to HCS
    await kit.submitTopicMessage(
      topicId,
      JSON.stringify({
        type: 'ai_recommendation',
        timestamp: Date.now(),
        data: {
          requestId,
          recommendedRatios: aiResponse.ratios,
          confidence: aiResponse.confidence,
          reasoning: aiResponse.reasoning,
          analysisFactors: {
            volatilityTrend: aiResponse.volatilityTrend,
            liquidityTrend: aiResponse.liquidityTrend
          }
        }
      })
    );
    
    return NextResponse.json({
      ratios: aiResponse.ratios,
      confidence: aiResponse.confidence,
      reasoning: aiResponse.reasoning,
      topicId: topicId.toString(),
      requestId
    });
    
  } catch (error: any) {
    console.error('AI recommendation error:', error);
    return NextResponse.json(
      { error: `Failed to get AI recommendation: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper functions for AI analysis
function analyzeVolatilityTrend(historicalRequests: any[]): 'increasing' | 'decreasing' | 'stable' {
  if (historicalRequests.length < 3) return 'stable';
  
  const recentVolatility = historicalRequests.slice(-3).map(req => 
    (req.data.marketConditions.volatility.hbar + 
     req.data.marketConditions.volatility.sauce + 
     req.data.marketConditions.volatility.clxy) / 3
  );
  
  const trend = recentVolatility[2] - recentVolatility[0];
  
  if (trend > 0.02) return 'increasing';
  if (trend < -0.02) return 'decreasing';
  return 'stable';
}

function analyzeLiquidityTrend(historicalRequests: any[]): 'improving' | 'worsening' | 'stable' {
  if (historicalRequests.length < 3) return 'stable';
  
  const recentLiquidity = historicalRequests.slice(-3).map(req => 
    (req.data.marketConditions.liquidity.hbar + 
     req.data.marketConditions.liquidity.sauce + 
     req.data.marketConditions.liquidity.clxy) / 3
  );
  
  const trend = recentLiquidity[2] - recentLiquidity[0];
  const percentChange = trend / recentLiquidity[0];
  
  if (percentChange > 0.05) return 'improving';
  if (percentChange < -0.05) return 'worsening';
  return 'stable';
} 