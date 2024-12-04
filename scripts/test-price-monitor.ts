import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testPriceMonitor() {
  try {
    // 1. Insert test threshold
    const { data: threshold, error: insertError } = await supabase
      .from('Thresholds')
      .insert([
        {
          user_id: process.env.TEST_USER_ID,
          tokenA: process.env.TEST_TOKEN_A, // USDC contract address
          tokenB: process.env.TEST_TOKEN_B, // WHBAR contract address
          fee: 3000, // 0.3%
          stopLoss: 0.07, // Trigger when price falls below $0.07
          buyOrder: 0.09, // Trigger when price rises above $0.09
          stopLossCap: 100, // Maximum amount to sell in USD
          buyOrderCap: 100, // Maximum amount to buy in USD
          hederaAccountId: process.env.TEST_HEDERA_ACCOUNT_ID,
          isActive: true,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert test threshold: ${insertError.message}`);
    }

    console.log('Test threshold created:', threshold);
    
    // 2. Simulate price change by calling monitor endpoint
    const monitorResponse = await axios.get('http://localhost:3000/api/thresholds/monitor', {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });

    console.log('Monitor response:', monitorResponse.data);
    
    // 3. Call executeOrder endpoint directly
    const testPrice = 0.06; // Below stop loss to trigger sale
    const executeResponse = await axios.post('http://localhost:3000/api/thresholds/executeOrder', {
      thresholdId: threshold.id,
      condition: 'sell',
      currentPrice: testPrice
    }, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });

    console.log('Execute order response:', executeResponse.data);

    // 4. Verify threshold status update
    const { data: updatedThreshold, error: fetchError } = await supabase
      .from('Thresholds')
      .select('*')
      .eq('id', threshold.id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch updated threshold: ${fetchError.message}`);
    }

    console.log('Final threshold status:', updatedThreshold);

    // 5. Cleanup - deactivate test threshold
    const { error: cleanupError } = await supabase
      .from('Thresholds')
      .update({ isActive: false })
      .eq('id', threshold.id);

    if (cleanupError) {
      console.error('Failed to cleanup test threshold:', cleanupError);
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testPriceMonitor(); 