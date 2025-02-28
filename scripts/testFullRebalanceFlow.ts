const axiosFlow = require('axios');
const dotenvFlow = require('dotenv');
const pathFlow = require('path');
const fsFlow = require('fs');

// Load environment variables from .env.local
const envLocalPathFlow = pathFlow.resolve(process.cwd(), '.env.local');
if (fsFlow.existsSync(envLocalPathFlow)) {
  console.log(`Loading environment from ${envLocalPathFlow}`);
  const envConfig = dotenvFlow.parse(fsFlow.readFileSync(envLocalPathFlow));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvFlow.config();
}

async function testFullRebalanceFlow() {
  try {
    console.log('Testing full rebalance flow...');
    
    // Step 1: Get current market data
    console.log('\n1. Getting current market data...');
    const marketResponse = await axiosFlow.get(
      'http://localhost:3000/api/ai/rebalance',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { currentRatios, marketConditions } = marketResponse.data;
    console.log('Current ratios:', currentRatios);
    console.log('Market conditions:', marketConditions);
    
    // Step 2: Request AI analysis
    console.log('\n2. Requesting AI analysis...');
    const analysisResponse = await axiosFlow.post(
      'http://localhost:3000/api/ai/rebalance/analyze',
      {
        currentRatios,
        marketConditions
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { requestId, recommendedRatios, confidence, reasoning } = analysisResponse.data;
    console.log('Analysis request ID:', requestId);
    console.log('Recommended ratios:', recommendedRatios);
    console.log('Confidence:', confidence);
    console.log('Reasoning:', reasoning);
    
    // Step 3: Execute the rebalance
    console.log('\n3. Executing rebalance...');
    const executionResponse = await axiosFlow.post(
      'http://localhost:3000/api/governance/rebalance/execute',
      {
        requestId,
        previousRatios: currentRatios,
        newRatios: recommendedRatios,
        confidence,
        reasoning
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Execution response:', executionResponse.data);
    
    // Step 4: Verify in history
    console.log('\n4. Verifying in history...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for HCS consensus
    
    const historyResponse = await axiosFlow.get(
      'http://localhost:3000/api/ai/rebalance/history',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const matchingHistory = historyResponse.data.find((item: any) => 
      item.requestId === requestId && item.executions && item.executions.length > 0
    );
    
    if (matchingHistory) {
      console.log('Found matching history record:');
      console.log(JSON.stringify(matchingHistory, null, 2));
      console.log('\nFull rebalance flow completed successfully!');
    } else {
      console.log('No matching history record found yet. This may be due to HCS consensus timing.');
    }
    
  } catch (error: any) {
    console.error('Error in rebalance flow:', error.response?.data || error.message);
  }
}

testFullRebalanceFlow(); 