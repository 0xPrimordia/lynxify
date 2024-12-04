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
        userId: '0x...',
        tokenA: '0x...',
        tokenB: '0x...',
        fee: 3000,
        stopLoss: 0.07,
        buyOrder: 0.09,
        stopLossCap: 100,
        buyOrderCap: 100,
        hederaAccountId: '0.0.123456'
      }
    ])
    .select();

  console.log('Inserted threshold:', data);
  if (error) console.error('Error:', error);
}

insertTestThreshold(); 