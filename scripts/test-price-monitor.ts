import axios from 'axios';

async function testPriceMonitor() {
  try {
    // 1. Insert test threshold (using script above)
    
    // 2. Simulate price change
    const testPrice = 0.06; // Below stop loss to trigger sale
    
    // 3. Call your executeOrder endpoint
    const response = await axios.post('http://localhost:3000/api/thresholds/executeOrder', {
      thresholdId: 'your-threshold-id',
      condition: 'sell',
      currentPrice: testPrice
    }, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPriceMonitor(); 