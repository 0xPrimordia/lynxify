import { TESTNET_REWARDS } from '@/config/rewards';

export type PriceHistory = {
    id: number;
    tokenId: string;
    open: number;
    openUsd: number;
    high: number;
    highUsd: number;
    low: number;
    lowUsd: number;
    close: number;
    closeUsd: number;
    avg: number;
    avgUsd: number;
    volume: string;
    liquidity: string;
    volumeUsd: number;
    liquidityUsd: number;
    timestampSeconds: number;
    startTimestampSeconds: number;
}

export type ApiLiquidityPoolV2 = {
    id: number;
    contractId: string;
    tokenA: ApiToken;
    amountA: string; //total amount for tokenA, in smallest unit
    tokenB: ApiToken;
    amountB: string; //total amount for tokenB, in smallest unit
    fee: number;
    sqrtRatioX96: string;
    tickCurrent: number;
    liquidity: string;
}
  
export type ApiToken = {
    decimals: number
    icon?: string
    id: string
    name: string
    price: string
    priceUsd: number
    symbol: string
    dueDiligenceComplete: boolean
    isFeeOnTransferToken: boolean
    timestampSecondsLastListingChange: number
    description: string | null
    website: string | null
    twitterHandle: string | null
    sentinelReport: string | null
}

export type Threshold = {
    id: number;
    userId: string;
    type: 'stopLoss' | 'buyOrder' | 'sellOrder';
    price: number;
    cap: number;
    hederaAccountId: string;
    tokenA: string;
    tokenB: string;
    fee: number;
    isActive: boolean;
    lastError: string;
    lastChecked: string;
    createdAt: string;
    status: string;
    lastExecutedAt: string;
    txHash: string;
    slippageBasisPoints: number;
    testnet: boolean;
}

export type Token = {
    decimals: number;
    dueDiligenceComplete: boolean;
    icon: string;
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    symbol: string;
    isFeeOnTransferToken: boolean;
}

export interface User {
    id: string;
    created_at: string;
    hederaAccountId?: string;
    isInAppWallet?: boolean;
}
  

  export type CompletedTask = {
    completed_at: string;
    xp_awarded: number;
  }

  export type UserAchievement = {
    id?: string;
    user_id: string;
    hedera_account_id: string;
    task_id: keyof typeof TESTNET_REWARDS.TASKS;
    xp_awarded: number;
    completed_at?: string;
    created_at?: string;
}

export type Pool = {
    id: string;
    tokenA: ApiToken | null;
    tokenB: ApiToken | null;
    fee: number;
    sqrtRatioX96: string;
    tickCurrent: number;
    liquidity: string;
}

export interface PasswordModalContext {
    isOpen: boolean;
    description: string;
    transaction: string | null;
    transactionPromise?: {
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    } | null;
}

export interface RateLimitResult {
    blocked: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

export interface RateLimitError {
    message: string;
    code: string;
    details?: Record<string, unknown>;
}

export type RateLimitType = 'auth' | 'wallet' | 'reset' | 'create' | 'backup' | 'sign';

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    blockDuration?: number;
    increaseFactor?: number;
}

export interface RateLimitKey {
    ip: string;
    userId?: string;
    sessionId?: string;
    type: string;
}

export const RATE_LIMIT_CONFIGS: { [key: string]: RateLimitConfig } = {
    'auth': { 
        maxRequests: 5, 
        windowMs: 60 * 1000,
        blockDuration: 15 * 60 * 1000,
        increaseFactor: 2
    },
    'wallet': { 
        maxRequests: 10, 
        windowMs: 60 * 1000,
        blockDuration: 30 * 60 * 1000,
        increaseFactor: 3
    },
    'reset': { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    'create': { maxRequests: 2, windowMs: 60 * 60 * 1000 },
    'backup': { maxRequests: 5, windowMs: 60 * 1000 },
    'sign': { maxRequests: 20, windowMs: 60 * 1000 }
};

export interface WalletOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}