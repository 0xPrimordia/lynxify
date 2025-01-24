import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { SWAP_ROUTER_ADDRESS } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAllowance, approveTokenForSwap, checkTokenAssociation, associateToken } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../saucerswap';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapTokenToToken = async (
  amountIn: string,
  inputToken: string,
  outputToken: string,
  fee: number,
  recipientAddress: string,
  deadline: number,
  slippageBasisPoints: number,
  inputTokenDecimals: number,
  outputTokenDecimals: number
) => {
  try {
    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();
    
    // Get quote
    const quoteAmount = await getQuoteExactInput(
      inputToken,
      inputTokenDecimals,
      outputToken,
      amountIn,
      fee,
      outputTokenDecimals
    );

    // Calculate minimum output using slippage
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams
    const params = {
      path: path,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: deadline,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTokens
    };

    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [[swapEncoded]]);

    return { type: 'swap' as const, tx: encodedData };
  } catch (error) {
    console.error('Error in swapTokenToToken:', error);
    throw error;
  }
}; 