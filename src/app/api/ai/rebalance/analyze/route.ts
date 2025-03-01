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

// Mock data for fallback when OpenAI fails
const generateMockRecommendation = (currentRatios: TokenRatios): AIRecommendation => {
  return {
    newRatios: {
      hbar: 0.40,
      sauce: 0.35,
      clxy: 0.25
    },
    confidence: 0.85,
    reasoning: [
      "Mock recommendation due to AI service unavailability",
      "Increased HBAR allocation based on lower volatility",
      "Reduced CLXY allocation due to higher volatility"
    ],
    marketAnalysis: "This is a mock market analysis provided when the AI service is unavailable.",
    riskAssessment: "This is a mock risk assessment provided when the AI service is unavailable."
  };
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("API route called: /api/ai/rebalance/analyze");
  
  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return NextResponse.json(
        { error: 'Server configuration error: Missing OpenAI API key' },
        { status: 500 }
      );
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    
    // Parse request data
    let requestData: RebalanceRequest;
    try {
      requestData = await request.json() as RebalanceRequest;
      console.log("Request data parsed successfully:", JSON.stringify(requestData));
      console.log(`Time elapsed after parsing request: ${Date.now() - startTime}ms`);
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return NextResponse.json(
        { error: 'Invalid request format', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }
    
    const { currentRatios, marketConditions } = requestData;
    
    // Validate input
    if (!currentRatios || !marketConditions) {
      console.error("Missing required parameters in request");
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Create a unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize HCS service (with error handling)
    let hcsService;
    const REBALANCING_TOPIC_ID = process.env.LYNX_REBALANCING_TOPIC_ID;
    
    try {
      if (REBALANCING_TOPIC_ID) {
        console.log("Initializing HCS service");
        hcsService = new HCSService({
          operatorId: process.env.NEXT_PUBLIC_OPERATOR_ID!,
          operatorKey: process.env.OPERATOR_KEY!,
          network: 'testnet'
        });
        
        // Record the analysis request on HCS
        console.log("Submitting message to HCS topic:", REBALANCING_TOPIC_ID);
        await hcsService.submitMessage(REBALANCING_TOPIC_ID, {
          type: 'REBALANCE_REQUEST',
          requestId,
          timestamp: new Date().toISOString(),
          currentRatios,
          marketConditions
        });
        console.log("HCS message submitted successfully");
      } else {
        console.log("Skipping HCS integration - no topic ID provided");
      }
    } catch (hcsError) {
      console.error("Error with HCS service:", hcsError);
      // Continue execution - don't fail the whole request if HCS fails
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

    // Before OpenAI call
    console.log(`Time elapsed before OpenAI call: ${Date.now() - startTime}ms`);
    
    // Call OpenAI API with error handling
    let recommendation: AIRecommendation;
    
    try {
      console.log("Calling OpenAI API");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a financial advisor specializing in tokenized index management." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });
      
      console.log(`Time elapsed after OpenAI call: ${Date.now() - startTime}ms`);
      
      const responseContent = completion.choices[0].message.content;
      console.log("OpenAI response received");
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Extract JSON from the response
      try {
        const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || 
                          responseContent.match(/```\n([\s\S]*?)\n```/) || 
                          responseContent.match(/{[\s\S]*?}/);
        
        if (!jsonMatch) {
          throw new Error('Could not extract JSON from OpenAI response');
        }
        
        const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
        recommendation = JSON.parse(jsonString) as AIRecommendation;
        console.log("Successfully parsed OpenAI response");
        
        // Validate the recommendation
        const newRatiosSum = Object.values(recommendation.newRatios).reduce((sum, ratio) => sum + Number(ratio), 0);
        
        if (Math.abs(newRatiosSum - 1) > 0.01) {
          // Normalize ratios if they don't sum to 1
          console.log("Normalizing ratios - sum was:", newRatiosSum);
          const normalizedRatios: TokenRatios = {};
          Object.entries(recommendation.newRatios).forEach(([token, ratio]) => {
            normalizedRatios[token] = Number(ratio) / newRatiosSum;
          });
          recommendation.newRatios = normalizedRatios;
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError, "Response was:", responseContent);
        // Fall back to mock data
        console.log("Using mock recommendation due to parsing error");
        recommendation = generateMockRecommendation(currentRatios);
      }
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      console.log(`Time elapsed at OpenAI error: ${Date.now() - startTime}ms`);
      // Fall back to mock data
      console.log("Using mock recommendation due to OpenAI API error");
      recommendation = generateMockRecommendation(currentRatios);
    }
    
    // Before HCS
    console.log(`Time elapsed before HCS: ${Date.now() - startTime}ms`);
    
    // Record the recommendation on HCS (with error handling)
    try {
      if (REBALANCING_TOPIC_ID && hcsService) {
        console.log("Recording recommendation on HCS");
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
        console.log("Recommendation recorded on HCS");
      }
    } catch (hcsError) {
      console.error("Error recording recommendation on HCS:", hcsError);
      // Continue execution - don't fail if HCS recording fails
    }
    
    // Return the response
    console.log(`Total time elapsed: ${Date.now() - startTime}ms`);
    console.log("Returning successful response");
    return NextResponse.json({
      requestId,
      currentRatios,
      recommendation,
      transactionId: REBALANCING_TOPIC_ID ? 'recorded-on-hcs' : 'hcs-disabled'
    });
    
  } catch (error) {
    console.error('Unhandled error in rebalance analysis:', error);
    console.log(`Time elapsed at error: ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 