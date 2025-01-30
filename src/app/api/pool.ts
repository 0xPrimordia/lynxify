// Add this function to fetch pool data with ticks
export async function getPoolWithTicks(poolId: string) {
    try {
        // Use test API endpoint
        const response = await fetch(`https://test-api.saucerswap.finance/v2/pools/${poolId}`);
        const poolData = await response.json();

        console.log('Raw pool data from API:', poolData);

        // Since we don't have access to ticks endpoint, generate synthetic ticks
        const currentPrice = calculatePrice(poolData.sqrtRatioX96);
        const ticks = generateTicksFromPool(poolData, currentPrice);

        return {
            ...poolData,
            currentPrice,
            ticks
        };
    } catch (error) {
        console.error('Error fetching pool with ticks:', error);
        // Return a default structure instead of throwing
        return {
            currentPrice: 0,
            ticks: [],
            liquidity: '0'
        };
    }
}

// Helper function to calculate price from sqrtRatioX96
function calculatePrice(sqrtRatioX96: string) {
    try {
        // Convert the sqrtRatioX96 to BigInt
        const sqrtPriceX96 = BigInt(sqrtRatioX96);
        const Q96 = BigInt(2) ** BigInt(96);
        
        // Calculate price = (sqrtPrice * sqrtPrice) / (2^192)
        const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
        
        // Convert to decimal considering token decimals
        const priceDecimal = Number(price) / (10 ** 8); // Assuming HBAR decimals (8)
        
        console.log('Price calculation:', {
            sqrtRatioX96,
            calculatedPrice: price.toString(),
            finalPrice: priceDecimal
        });
        
        return priceDecimal;
    } catch (error) {
        console.error('Error calculating price:', error);
        return 0;
    }
}

// Helper function to generate synthetic ticks around the current price
function generateTicksFromPool(pool: any, currentPrice: number) {
    if (!currentPrice || currentPrice === 0) {
        console.error('Invalid current price for tick generation:', currentPrice);
        return [];
    }

    console.log('Starting tick generation with:', {
        currentPrice,
        poolLiquidity: pool.liquidity,
        amountA: pool.amountA,
        amountB: pool.amountB
    });
    
    const ticks = [];
    const numTicks = 50;
    const priceRange = currentPrice * 0.5; // ±50% of current price
    const tickSpacing = priceRange / numTicks;
    
    // Calculate base liquidity from pool amounts
    const baseTokenDecimals = 8; // HBAR decimals
    const quoteTokenDecimals = 6; // SAUCE decimals
    
    const amountA = Number(pool.amountA) / (10 ** baseTokenDecimals);
    const amountB = Number(pool.amountB) / (10 ** quoteTokenDecimals);
    
    // Generate ticks below current price
    for (let i = 0; i < numTicks; i++) {
        const price = currentPrice - (tickSpacing * i);
        const liquidity = Number(pool.liquidity) * Math.exp(-i / numTicks);
        ticks.push({
            price: price.toString(),
            liquidity: liquidity.toString(),
            tickIdx: -i
        });
    }

    // Generate ticks above current price
    for (let i = 1; i <= numTicks; i++) {
        const price = currentPrice + (tickSpacing * i);
        const liquidity = Number(pool.liquidity) * Math.exp(-i / numTicks);
        ticks.push({
            price: price.toString(),
            liquidity: liquidity.toString(),
            tickIdx: i
        });
    }

    const sortedTicks = ticks.sort((a, b) => Number(a.price) - Number(b.price));
    
    console.log('Generated ticks:', {
        tickCount: sortedTicks.length,
        firstTick: sortedTicks[0],
        lastTick: sortedTicks[sortedTicks.length - 1],
        priceRange: {
            min: sortedTicks[0].price,
            max: sortedTicks[sortedTicks.length - 1].price
        }
    });

    return sortedTicks;
} 