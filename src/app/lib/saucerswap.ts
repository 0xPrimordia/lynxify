import { WHBAR_ID } from './constants';

export { swapHbarToToken } from './trades/hbarToToken';
export { swapTokenToHbar } from './trades/tokenToHbar';
export { swapTokenToToken } from './trades/tokenToToken';
export { getQuoteExactInput } from './quoter';
export { WHBAR_ID, SWAP_ROUTER_ADDRESS, QUOTER_V2_ADDRESS } from './constants';

// Define and export the SwapType type
export type SwapType = 'hbarToToken' | 'tokenToHbar' | 'tokenToToken';

// Add new type for routing strategy
export type RoutingStrategy = {
  useWhbarPath: boolean;
  intermediateToken?: string;
  intermediateTokenDecimals?: number;
};

export type SwapResponse = {
  type: 'approval' | 'associate' | 'swap';
  tx?: string;
  amountOut?: any;
} | {
  type: 'approve';
  tx: string;
};

// Export the function with routing strategy support
export const getSwapType = (
  inputToken: string, 
  outputToken: string,
  routing?: RoutingStrategy
): { type: SwapType; routing: RoutingStrategy } => {
  // Default routing strategy
  const defaultRouting: RoutingStrategy = {
    useWhbarPath: false
  };

  if (inputToken === WHBAR_ID) {
    return { 
      type: 'hbarToToken',
      routing: defaultRouting 
    };
  }
  
  if (outputToken === WHBAR_ID) {
    return { 
      type: 'tokenToHbar',
      routing: routing || defaultRouting 
    };
  }

  return { 
    type: 'tokenToToken',
    routing: routing || defaultRouting 
  };
}; 