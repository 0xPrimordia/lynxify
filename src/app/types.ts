import { Session } from '@supabase/supabase-js';
import { SessionTypes } from '@walletconnect/types';

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
}

export type User = {
    id: string;
    hederaAccountId: string;
    created_at: string;
}

// Session State Types
export interface WalletState {
    isConnected: boolean;
    accountId: string | null;
    session: SessionTypes.Struct | null;
}

export interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    session: Session | null;
}

export interface SessionState {
    wallet: WalletState;
    auth: AuthState;
}
  

  export type CompletedTask = {
    completed_at: string;
    xp_awarded: number;
  }

  export type UserAchievements = {
    id?: string;
    user_id: string;
    hedera_account_id: string;
    total_xp: number;
    completed_tasks: {
      [taskId: string]: CompletedTask;
    };
    created_at?: string;
    updated_at?: string;
  }
