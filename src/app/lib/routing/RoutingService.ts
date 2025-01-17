import { IRoutingService, RouteInfo, TokenInfo, PoolInfo } from './types';
import { getQuoteExactInput } from '../quoter';

export class RoutingService implements IRoutingService {
    private poolCache: Map<string, PoolInfo> = new Map();
    private readonly MAX_HOPS = 3;  // Maximum number of hops in a route

    constructor(
        private readonly quoterContract: string,
        private readonly defaultFee: number = 3000
    ) {}

    async findRoutes({ inputToken, outputToken, amountIn }: {
        inputToken: TokenInfo;
        outputToken: TokenInfo;
        amountIn: string;
    }): Promise<RouteInfo[]> {
        // Start with direct route
        const routes: RouteInfo[] = [];
        
        // Get direct pool if it exists
        const directPool = await this.getPool(inputToken.address, outputToken.address);
        if (directPool) {
            routes.push({
                path: [inputToken.address, outputToken.address],
                fees: [this.defaultFee],
                pools: [directPool],
                expectedOutput: BigInt(0)  // Will be filled by getQuote
            });
        }

        // TODO: Implement multi-hop route discovery
        // This will involve:
        // 1. Getting all pools for input token
        // 2. For each pool, check if output token is available
        // 3. If not, recurse up to MAX_HOPS
        
        return routes;
    }

    async getQuote(route: RouteInfo, amountIn: string): Promise<{
        quote: string;
        priceImpact: number;
    }> {
        try {
            const quote = await getQuoteExactInput(
                route.path[0],
                route.pools[0].token0.decimals,
                route.path[route.path.length - 1],
                amountIn,
                route.fees[0],
                route.pools[route.pools.length - 1].token1.decimals
            );

            // TODO: Calculate price impact
            const priceImpact = 0; // Placeholder

            return {
                quote,
                priceImpact
            };
        } catch (error) {
            console.error('Error getting quote:', error);
            throw error;
        }
    }

    async validateRoute(route: RouteInfo): Promise<boolean> {
        // Check if all pools in route still exist and have sufficient liquidity
        return route.pools.every(pool => this.poolHasSufficientLiquidity(pool));
    }

    private async getPool(token0: string, token1: string): Promise<PoolInfo | null> {
        const poolKey = this.getPoolKey(token0, token1);
        
        if (this.poolCache.has(poolKey)) {
            return this.poolCache.get(poolKey)!;
        }

        // TODO: Implement pool fetching from SaucerSwap
        return null;
    }

    private poolHasSufficientLiquidity(pool: PoolInfo): boolean {
        // TODO: Implement liquidity validation
        return pool.liquidity > BigInt(0);
    }

    private getPoolKey(token0: string, token1: string): string {
        // Ensure consistent ordering
        const [t0, t1] = token0 < token1 ? [token0, token1] : [token1, token0];
        return `${t0}-${t1}`;
    }
} 