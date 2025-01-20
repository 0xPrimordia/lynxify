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
    ) {
        if (!this.factoryAddress) {
            throw new Error('Factory address must be provided');
        }
    }

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

    private async getPoolAddress(token0: string, token1: string): Promise<string> {
        try {
            // Ensure consistent token ordering
            const [t0, t1] = token0 < token1 ? [token0, token1] : [token1, token0];
            
            console.log('Looking for pool with tokens:', { t0, t1 });
            
            // Query mirror node for pool address
            const url = `${this.MIRROR_NODE_URL}/api/v1/contracts/${this.factoryAddress}/results?timestamp=gte:0&order=desc&limit=100`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('Got factory events:', data);

            // First get the token addresses in EVM format
            const [token0Resp, token1Resp] = await Promise.all([
                fetch(`${this.MIRROR_NODE_URL}/api/v1/accounts/${t0}`),
                fetch(`${this.MIRROR_NODE_URL}/api/v1/accounts/${t1}`)
            ]);

            const token0Data = await token0Resp.json();
            const token1Data = await token1Resp.json();

            const token0EvmAddress = token0Data.evm_address;
            const token1EvmAddress = token1Data.evm_address;

            console.log('Token EVM addresses:', {
                token0: token0EvmAddress,
                token1: token1EvmAddress
            });

            // Look for PoolCreated event with these tokens
            const poolEvent = data.results?.find((result: any) => {
                if (!result?.data) return false;
                
                return result.data.includes('PoolCreated') &&
                       result.data.includes(token0EvmAddress?.toLowerCase().slice(2)) &&
                       result.data.includes(token1EvmAddress?.toLowerCase().slice(2));
            });

            if (!poolEvent) {
                console.log('No pool found for tokens');
                return '';
            }

            console.log('Found pool:', poolEvent.address);
            return poolEvent.address;
        } catch (error) {
            console.error('Error in getPoolAddress:', error);
            return '';
        }
    }

    // Helper method to convert token ID to hex
    private tokenIdToHex(tokenId: string): string {
        // Remove '0.0.' prefix if present
        const numericId = tokenId.replace('0.0.', '');
        // Convert to hex and pad to 64 characters
        return BigInt(numericId).toString(16).padStart(64, '0');
    }

    private async getPoolData(poolAddress: string): Promise<PoolResponse | null> {
        try {
            const response = await fetch(`${this.MIRROR_NODE_URL}/api/v1/contracts/${poolAddress}/state`);
            if (!response.ok) {
                throw new Error(`Failed to fetch pool data: ${response.statusText}`);
            }
            const data = await response.json();

            // Parse pool state
            const slot0 = data.state.find((s: any) => s.slot === '0x0');
            const token0Slot = data.state.find((s: any) => s.slot === '0x2');
            const token1Slot = data.state.find((s: any) => s.slot === '0x3');
            const liquiditySlot = data.state.find((s: any) => s.slot === '0x7');

            if (!slot0 || !token0Slot || !token1Slot || !liquiditySlot) {
                console.error('Missing required pool state data');
                return null;
            }

            // Get token decimals
            const token0Decimals = await this.getTokenDecimals(token0Slot.value);
            const token1Decimals = await this.getTokenDecimals(token1Slot.value);

            return {
                token0: token0Slot.value,
                token1: token1Slot.value,
                fee: this.defaultFee,
                liquidity: liquiditySlot.value,
                sqrtPriceX96: slot0.value.slice(0, 66),
                token0Decimals,
                token1Decimals
            };
        } catch (error) {
            console.error('Error getting pool data:', error);
            return null;
        }
    }

    private async getTokenDecimals(tokenAddress: string): Promise<number> {
        try {
            // Query token info from mirror node
            const response = await fetch(`${this.MIRROR_NODE_URL}/api/v1/tokens/${tokenAddress}`);
            const data = await response.json();
            return data.decimals || 0;
        } catch (error) {
            console.error('Error getting token decimals:', error);
            return 0;
        }
    }

    private getPoolKey(token0: string, token1: string): string {
        // Ensure consistent ordering
        const [t0, t1] = token0 < token1 ? [token0, token1] : [token1, token0];
        return `${t0}-${t1}-${this.defaultFee}`;
    }

    async getAllPoolsForToken(tokenAddress: string): Promise<PoolInfo[]> {
        try {
            // Query mirror node for all pools containing this token
            const response = await fetch(
                `${this.MIRROR_NODE_URL}/api/v1/contracts/${this.factoryAddress}/results?timestamp=gte:0&order=desc&limit=100`
            );
            const data = await response.json();

            if (!data || !data.results) {
                console.error('Invalid factory events data:', data);
                return [];
            }

            // Filter for PoolCreated events containing our token
            const poolsData = data.results
                .filter((result: any) => {
                    if (!result || !result.data) return false;
                    // Look for PoolCreated events
                    return result.data.includes('PoolCreated') &&
                        (result.data.includes(tokenAddress.toLowerCase()) || 
                         result.data.includes(tokenAddress.toUpperCase()));
                });

            // Get pool info for each pool
            const poolPromises = poolsData.map(async (poolData: any) => {
                const poolAddress = poolData.address;
                return this.getPoolData(poolAddress);
            });

            const pools = await Promise.all(poolPromises);
            return pools.filter((pool): pool is PoolInfo => pool !== null);

        } catch (error) {
            console.error('Error getting pools for token:', error);
            return [];
        }
    }

    private async poolHasSufficientLiquidity(pool: PoolInfo): Promise<boolean> {
        const MINIMUM_LIQUIDITY = BigInt(1000); // Adjust this value based on token decimals
        return pool.liquidity >= MINIMUM_LIQUIDITY;
    }
} 