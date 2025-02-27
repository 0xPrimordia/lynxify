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
    // Validate amount is not in hex format
    if (amountIn.startsWith('0x')) {
      throw new Error('Amount cannot be in hex format');
    }

    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();
    
    // Check allowance first
    const allowanceResponse = await checkTokenAllowance(
      recipientAddress,
      inputToken,
      SWAP_ROUTER_ADDRESS,
      amountInSmallestUnit,
      inputTokenDecimals
    );

    // If not approved, return approval transaction
    if (!allowanceResponse) {
      console.log('Token needs approval, returning approval transaction');
      return {
        type: 'approve' as const,
        tx: await approveTokenForSwap(
          inputToken,
          amountInSmallestUnit,
          recipientAddress,
          inputTokenDecimals
        )
      };
    }

    // If approved, proceed with swap
    console.log('Token is approved, proceeding with swap');

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
    const outputMinimum = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    // Convert to ethers-compatible format
    const path = ethers.concat([
      ethers.getBytes(ContractId.fromString(inputToken).toSolidityAddress()),
      ethers.getBytes('0x' + fee.toString(16).padStart(6, '0')),
      ethers.getBytes(ContractId.fromString(outputToken).toSolidityAddress())
    ]);

    // ExactInputParams
    const params = {
      path: path,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: deadline,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinimum
    };

    // Create swap transaction
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    
    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(3_000_000)
      .setFunctionParameters(Buffer.from(swapEncoded.slice(2), 'hex'))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return {
      type: 'swap' as const,
      tx: transactionToBase64String(transaction)
    };

  } catch (error) {
    console.error('Error in swapTokenToToken:', error);
    throw error;
  }
}; 