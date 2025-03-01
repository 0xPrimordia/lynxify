const axiosHistory = require('axios');
const dotenvHistory = require('dotenv');
const pathHistory = require('path');
const fsHistory = require('fs');

// Load environment variables from .env.local
const envLocalPathHistory = pathHistory.resolve(process.cwd(), '.env.local');
if (fsHistory.existsSync(envLocalPathHistory)) {
  console.log(`Loading environment from ${envLocalPathHistory}`);
  const envConfig = dotenvHistory.parse(fsHistory.readFileSync(envLocalPathHistory));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('.env.local file not found, falling back to dotenv.config()');
  dotenvHistory.config();
}

async function testRebalanceHistory() {
  try {
    console.log('Testing rebalance history endpoint...');
    
    // Call the API
    const response = await axiosHistory.get(
      'http://localhost:3000/api/ai/rebalance/history',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Number of history items:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('Sample history item:');
      console.log(JSON.stringify(response.data[0], null, 2));
    } else {
      console.log('No history items found.');
    }
    
  } catch (error: any) {
    console.error('Error testing rebalance history:', error.response?.data || error.message);
  }
}

testRebalanceHistory(); 