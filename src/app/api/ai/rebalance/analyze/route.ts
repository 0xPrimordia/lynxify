import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HCSService } from '@/services/hcsService';

// Define types for our data structures
interface TokenRatios {
  [token: string]: number;
}

interface MarketConditions {
  prices: {
    [token: string]: number;
  };
  volatility: {
    [token: string]: number;
  };
  liquidity: {
    [token: string]: number;
  };
}

interface RebalanceRequest {
  currentRatios: TokenRatios;
  marketConditions: MarketConditions;
}

interface AIRecommendation {
  newRatios: TokenRatios;
  confidence: number;
  reasoning: string[];
  marketAnalysis: string;
  riskAssessment: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Initialize HCS service
const hcsService = new HCSService({
  operatorId: process.env.NEXT_PUBLIC_OPERATOR_ID!,
  operatorKey: process.env.OPERATOR_KEY!,
  network: 'testnet'
});

// Topic ID for rebalancing analysis
const REBALANCING_TOPIC_ID = process.env.LYNX_REBALANCING_TOPIC_ID;

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json() as RebalanceRequest;
    const { currentRatios, marketConditions } = requestData;
    
    // Validate input
    if (!currentRatios || !marketConditions) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Create a unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Record the analysis request on HCS
    if (REBALANCING_TOPIC_ID) {
      await hcsService.submitMessage(REBALANCING_TOPIC_ID, {
        type: 'REBALANCE_REQUEST',
        requestId,
        timestamp: new Date().toISOString(),
        currentRatios,
        marketConditions
      });
    }
    
    // Prepare the prompt for OpenAI
    const prompt = `
You are an AI financial advisor specializing in tokenized index management. 
Your task is to analyze market conditions and recommend optimal token ratios for a tokenized index called LYNX.

Current token ratios in the LYNX index:
${Object.entries(currentRatios).map(([token, ratio]) => `- ${token.toUpperCase()}: ${(Number(ratio) * 100).toFixed(2)}%`).join('\n')}

Current market conditions:
${Object.entries(marketConditions.prices).map(([token, price]) => `- ${token.toUpperCase()} price: $${price}`).join('\n')}
${Object.entries(marketConditions.volatility).map(([token, vol]) => `- ${token.toUpperCase()} volatility: ${(Number(vol) * 100).toFixed(2)}%`).join('\n')}
${Object.entries(marketConditions.liquidity).map(([token, liq]) => `- ${token.toUpperCase()} liquidity: $${Number(liq).toLocaleString()}`).join('\n')}

Based on these market conditions, recommend new token ratios for the LYNX index.
Provide a detailed explanation of your reasoning, including market analysis and risk assessment.
Your response should be in JSON format with the following structure:
{
  "newRatios": {
    "token1": ratio1,
    "token2": ratio2,
    ...
  },
  "confidence": 0.XX, // A number between 0 and 1 representing your confidence in this recommendation
  "reasoning": ["reason1", "reason2", ...], // Array of key reasons for the recommendation
  "marketAnalysis": "Detailed market analysis text",
  "riskAssessment": "Risk assessment text"
}

Ensure that all ratios sum to exactly 1.
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a financial advisor specializing in tokenized index management." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    // Parse the response
    const responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }
    
    let recommendation: AIRecommendation;
    
    try {
      // Extract JSON from the response
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || 
                        responseContent.match(/```\n([\s\S]*?)\n```/) || 
                        responseContent.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from OpenAI response');
      }
      
      const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
      recommendation = JSON.parse(jsonString) as AIRecommendation;
      
      // Validate the recommendation
      const newRatiosSum = Object.values(recommendation.newRatios).reduce((sum, ratio) => sum + Number(ratio), 0);
      
      if (Math.abs(newRatiosSum - 1) > 0.01) {
        // Normalize ratios if they don't sum to 1
        const normalizedRatios: TokenRatios = {};
        Object.entries(recommendation.newRatios).forEach(([token, ratio]) => {
          normalizedRatios[token] = Number(ratio) / newRatiosSum;
        });
        recommendation.newRatios = normalizedRatios;
      }
      
      // Record the recommendation on HCS
      if (REBALANCING_TOPIC_ID) {
        await hcsService.submitMessage(REBALANCING_TOPIC_ID, {
          type: 'REBALANCE_RECOMMENDATION',
          requestId,
          timestamp: new Date().toISOString(),
          currentRatios,
          newRatios: recommendation.newRatios,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          marketAnalysis: recommendation.marketAnalysis,
          riskAssessment: recommendation.riskAssessment
        });
      }
      
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return NextResponse.json(
        { error: 'Failed to generate recommendation', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      requestId,
      currentRatios,
      recommendation,
      transactionId: REBALANCING_TOPIC_ID ? 'recorded-on-hcs' : 'hcs-disabled'
    });
    
  } catch (error) {
    console.error('Error in rebalance analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 