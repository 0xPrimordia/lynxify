import { ethers } from 'ethers';
import SwapRouterAbi from './SwapRouter.json';
import { SWAP_ROUTER_ADDRESS } from '../constants';

export const swapRouterInterface = new ethers.Interface(SwapRouterAbi);

export type ExactInputParams = {
  path: string;
  recipient: string;
  deadline: number;
  amountIn: string;
  amountOutMinimum: number;
};

export const encodeSwapExactInput = (params: ExactInputParams) => {
  return swapRouterInterface.encodeFunctionData('exactInput', [params]);
};

export const encodeMulticall = (calls: string[]) => {
  return swapRouterInterface.encodeFunctionData('multicall', [calls]);
}; 