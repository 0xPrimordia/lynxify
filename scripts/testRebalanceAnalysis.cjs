const axiosAnalysis = require('axios');
const dotenvAnalysis = require('dotenv');
const pathAnalysis = require('path');
const fsAnalysis = require('fs');

// Load environment variables from .env.local
const envLocalPathAnalysis = pathAnalysis.resolve(process.cwd(), '.env.local');
if (fsAnalysis.existsSync(envLocalPathAnalysis)) {
  console.log(`Loading environment from ${envLocalPathAnalysis}`);
  const envConfig = dotenvAnalysis.parse(fsAnalysis.readFileSync(envLocalPathAnalysis));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvAnalysis.config();
}

async function testRebalanceAnalysis() {
  try {
    console.log('Testing rebalance analysis endpoint...');
    
    // Test data
    const testData = {
      currentRatios: {
        hbar: 0.33333,
        sauce: 0.33333,
        clxy: 0.33334
      },
      marketConditions: {
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
      }
    };
    
    // Call the API
    const response = await axiosAnalysis.post(
      'http://localhost:3000/api/ai/rebalance/analyze',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing rebalance analysis:', error.response?.data || error.message);
  }
}

testRebalanceAnalysis(); 