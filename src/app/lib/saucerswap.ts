import { WHBAR_ID } from './constants';

export { swapHbarToToken } from './trades/hbarToToken';
export { swapTokenToHbar } from './trades/tokenToHbar';
export { swapTokenToToken } from './trades/tokenToToken';
export { getQuoteExactInput } from './quoter';
export { WHBAR_ID, SWAP_ROUTER_ADDRESS, QUOTER_V2_ADDRESS } from './constants';

// Define and export the SwapType type
export type SwapType = 'hbarToToken' | 'tokenToHbar' | 'tokenToToken';

export type SwapResponse = {
  type: 'approval' | 'associate' | 'swap';
  tx?: string;
  amountOut?: any;
};

// Export the function directly
export const getSwapType = (inputToken: string, outputToken: string): SwapType => {
  if (inputToken === WHBAR_ID) return 'hbarToToken';
  if (outputToken === WHBAR_ID) return 'tokenToHbar';
  return 'tokenToToken';
}; 