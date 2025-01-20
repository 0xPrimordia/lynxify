import { WHBAR_ID } from './constants';
import { RoutingService } from './routing/RoutingService';
import { TokenInfo, RouteInfo } from './routing/types';
import { SAUCERSWAP_FACTORY_ADDRESS, SAUCERSWAP_QUOTER_ADDRESS } from './constants';

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
  // New optional fields for advanced routing
  route?: RouteInfo;
};

export type SwapResponse = {
  type: 'approval' | 'associate' | 'swap';
  tx?: string;
  amountOut?: any;
} | {
  type: 'approve';
  tx: string;
};

// Initialize routing service (but don't export the instance directly)
const routingService = new RoutingService(
    SAUCERSWAP_FACTORY_ADDRESS,
    SAUCERSWAP_QUOTER_ADDRESS,
    3000 // default fee
);

// Add new routing functions
export const findBestRoute = async (
    inputToken: string,
    inputTokenDecimals: number,
    outputToken: string,
    amountIn: string
): Promise<RouteInfo | null> => {
    const input: TokenInfo = {
        address: inputToken,
        decimals: inputTokenDecimals
    };
    
    const output: TokenInfo = {
        address: outputToken,
        decimals: inputTokenDecimals // You'll need to pass output decimals separately
    };

    const routes = await routingService.findRoutes({
        inputToken: input,
        outputToken: output,
        amountIn
    });

    // Return the best route or null if no routes found
    return routes.length > 0 ? routes[0] : null;
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