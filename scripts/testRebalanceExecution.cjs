const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`);
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenv.config();
}

async function testRebalanceExecution() {
  try {
    console.log('Testing rebalance execution endpoint...');
    
    // Test data
    const testData = {
      requestId: `req-${Date.now()}`,
      previousRatios: {
        hbar: 0.33333,
        sauce: 0.33333,
        clxy: 0.33334
      },
      newRatios: {
        hbar: 0.40,
        sauce: 0.35,
        clxy: 0.25
      },
      confidence: 0.85,
      reasoning: [
        "HBAR has shown lower volatility",
        "CLXY liquidity has decreased",
        "SAUCE price has stabilized"
      ]
    };
    
    // Call the API
    const response = await axios.post(
      'http://localhost:3000/api/governance/rebalance/execute',
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
    console.error('Error testing rebalance execution:', error.response?.data || error.message);
  }
}

testRebalanceExecution(); 