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
  
  type ApiToken = {
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