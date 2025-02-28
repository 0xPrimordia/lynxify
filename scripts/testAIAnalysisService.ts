const dotenvAI = require('dotenv');
const pathAI = require('path');
const fsAI = require('fs');
const { AIAnalysisService } = require('../src/services/aiAnalysisService');

// Load environment variables from .env.local
const envLocalPathAI = pathAI.resolve(process.cwd(), '.env.local');
if (fsAI.existsSync(envLocalPathAI)) {
  console.log(`Loading environment from ${envLocalPathAI}`);
  const envConfig = dotenvAI.parse(fsAI.readFileSync(envLocalPathAI));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvAI.config();
}

async function testAIAnalysisService() {
  try {
    // Check for environment variables
    const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
    const operatorKey = process.env.OPERATOR_KEY;
    const topicId = process.env.LYNX_MARKET_ANALYSIS_TOPIC_ID;
    
    if (!operatorId || !operatorKey || !topicId) {
      throw new Error("Missing required environment variables");
    }
    
    console.log('Testing AI Analysis Service...');
    console.log(`Using topic: ${topicId}`);
    
    // Initialize service
    const service = new AIAnalysisService(
      operatorId,
      operatorKey,
      'testnet',
      topicId
    );
    
    // Test market analysis
    const marketData = {
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
    
    console.log('Analyzing market data...');
    const analysis = await service.analyzeMarketConditions(marketData);
    
    console.log('Analysis result:');
    console.log(JSON.stringify(analysis, null, 2));
    
  } catch (error) {
    console.error('Error testing AI Analysis Service:', error);
  }
}

testAIAnalysisService(); 