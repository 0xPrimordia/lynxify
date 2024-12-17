import { ethers } from 'ethers';

export type ThresholdType = 'stopLoss' | 'buyOrder' | 'sellOrder';

// Raw parameters from API matching app/types.ts
export interface ThresholdInputParams {
  userId: string;
  type: ThresholdType;
  price: number;
  cap: number;
  hederaAccountId: string;
  tokenA: string;
  tokenB: string;
  fee: number;
  isActive: boolean;
}

// Processed parameters for contract interaction
export interface ThresholdContractParams {
  basisPoints: number;
  accountId: string;
  tokenAddress: string;
  amount: string;
}

// Parameters for executing orders
export interface ExecuteOrderParams {
  hederaAccountId: string;
  orderType: ThresholdType;
  path: string;
}

export const processThresholdParams = (params: ThresholdInputParams): ThresholdContractParams => {
  return {
    basisPoints: Math.floor(params.price * 10000),
    accountId: params.hederaAccountId,
    tokenAddress: params.tokenA,
    amount: ethers.parseUnits(params.cap.toString(), 6).toString(),
  };
}; 