import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function insertTestThreshold() {
  const { data, error } = await supabase
    .from('Thresholds')
    .insert([
      {
        user_id: '0x...', // Your test wallet address
        tokenA: '0x...', // USDC contract address
        tokenB: '0x...', // WHBAR contract address
        fee: 3000, // 0.3%
        stopLoss: 0.07, // Trigger when price falls below $0.07
        buyOrder: 0.09, // Trigger when price rises above $0.09
        stopLossCap: 100, // Maximum amount to sell
        buyOrderCap: 100, // Maximum amount to buy
        hederaAccountId: '0.0.123456' // Your Hedera account ID
      }
    ])
    .select();

  console.log('Inserted threshold:', data);
  if (error) console.error('Error:', error);
}

insertTestThreshold(); 