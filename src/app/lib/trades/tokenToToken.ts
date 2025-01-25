import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { SWAP_ROUTER_ADDRESS } from '../constants';
import { checkTokenAllowance, approveTokenForSwap } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../saucerswap';
import { hexToUint8Array } from '../utils/format';

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
    // Validate amount format
    if (amountIn.startsWith('0x')) {
      throw new Error('Amount cannot be in hex format');
    }
    
    // Convert amount to smallest unit
    const amountNum = Number(amountIn);
    if (isNaN(amountNum)) {
      throw new Error('Invalid amount format');
    }
    const amountInSmallestUnit = (amountNum * Math.pow(10, inputTokenDecimals)).toString();

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

    // ExactInputSingleParams
    const params = {
      tokenIn: ContractId.fromString(inputToken).toSolidityAddress(),
      tokenOut: ContractId.fromString(outputToken).toSolidityAddress(),
      fee: fee,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: deadline,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTokens,
      sqrtPriceLimitX96: 0
    };

    // Create swap call
    const encodedData = swapRouterAbi.encodeFunctionData('exactInputSingle', [params]);

    // Create the transaction
    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setPayableAmount(new Hbar(0))
      .setGas(5000000)
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return { type: 'swap' as const, tx: transactionToBase64String(transaction) };
  } catch (error) {
    console.error('Error in swapTokenToToken:', error);
    throw error;
  }
}; 