export type TokenInfo = {
    address: string;  // Hedera token ID
    decimals: number;
    symbol?: string;
};

export type PoolInfo = {
    token0: TokenInfo;
    token1: TokenInfo;
    fee: number;
    liquidity: bigint;
    sqrtPriceX96?: bigint;  // Current price if available
};

export type RouteInfo = {
    path: string[];          // Token addresses in order
    fees: number[];         // Fees for each hop
    pools: PoolInfo[];      // Pool information for each hop
    expectedOutput: bigint;
    priceImpact?: number;   // Estimated price impact as percentage
};

export interface IRoutingService {
    // Get all viable routes between two tokens
    findRoutes(params: {
        inputToken: TokenInfo;
        outputToken: TokenInfo;
        amountIn: string;
    }): Promise<RouteInfo[]>;

    // Get quote for a specific route
    getQuote(route: RouteInfo, amountIn: string): Promise<{
        quote: string;
        priceImpact: number;
    }>;

    // Validate if a route is still viable
    validateRoute(route: RouteInfo): Promise<boolean>;
} 