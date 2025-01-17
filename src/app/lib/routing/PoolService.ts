import { PoolInfo, TokenInfo } from './types';
import { ContractId } from '@hashgraph/sdk';

interface PoolResponse {
    token0: string;
    token1: string;
    fee: number;
    liquidity: string;
    sqrtPriceX96: string;
    token0Decimals: number;
    token1Decimals: number;
}

export class PoolService {
    private readonly MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
    private readonly poolCache: Map<string, {pool: PoolInfo, timestamp: number}> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    constructor(
        private readonly factoryAddress: string,
        private readonly defaultFee: number = 3000
    ) {}

    async getPool(token0: string, token1: string): Promise<PoolInfo | null> {
        const poolKey = this.getPoolKey(token0, token1);
        const cached = this.poolCache.get(poolKey);

        // Return cached pool if still valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.pool;
        }

        try {
            // Get pool address from factory
            const poolAddress = await this.getPoolAddress(token0, token1);
            if (!poolAddress) return null;

            // Get pool data from mirror node
            const poolData = await this.getPoolData(poolAddress);
            if (!poolData) return null;

            const pool: PoolInfo = {
                token0: {
                    address: poolData.token0,
                    decimals: poolData.token0Decimals,
                },
                token1: {
                    address: poolData.token1,
                    decimals: poolData.token1Decimals,
                },
                fee: poolData.fee,
                liquidity: BigInt(poolData.liquidity),
                sqrtPriceX96: BigInt(poolData.sqrtPriceX96)
            };

            // Cache the result
            this.poolCache.set(poolKey, {
                pool,
                timestamp: Date.now()
            });

            return pool;
        } catch (error) {
            console.error('Error fetching pool:', error);
            return null;
        }
    }

    private async getPoolAddress(token0: string, token1: string): Promise<string | null> {
        try {
            // Call SaucerSwap factory to get pool address
            const response = await fetch(`${this.MIRROR_NODE_URL}/api/v1/contracts/${this.factoryAddress}/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: {
                        // Encode getPool(address,address,uint24) function call
                        function: 'getPool',
                        arguments: [
                            ContractId.fromString(token0).toSolidityAddress(),
                            ContractId.fromString(token1).toSolidityAddress(),
                            this.defaultFee.toString()
                        ]
                    }
                })
            });

            const data = await response.json();
            if (!data.result || data.result === '0x0000000000000000000000000000000000000000') {
                return null;
            }

            return data.result;
        } catch (error) {
            console.error('Error getting pool address:', error);
            return null;
        }
    }

    private async getPoolData(poolAddress: string): Promise<PoolResponse | null> {
        try {
            // Get pool state from mirror node
            const response = await fetch(`${this.MIRROR_NODE_URL}/api/v1/contracts/${poolAddress}/state`);
            const data = await response.json();

            // TODO: Parse pool state data into PoolResponse format
            // This will require understanding SaucerSwap's pool storage layout
            
            return null; // Placeholder until we implement proper state parsing
        } catch (error) {
            console.error('Error getting pool data:', error);
            return null;
        }
    }

    private getPoolKey(token0: string, token1: string): string {
        // Ensure consistent ordering
        const [t0, t1] = token0 < token1 ? [token0, token1] : [token1, token0];
        return `${t0}-${t1}-${this.defaultFee}`;
    }
} 