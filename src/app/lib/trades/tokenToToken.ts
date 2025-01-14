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
    // Check if input token is approved
    const isApproved = await checkTokenAllowance(
      inputToken,
      recipientAddress,
      SWAP_ROUTER_ADDRESS,
      amountIn,
      inputTokenDecimals
    );

    if (!isApproved) {
      return { 
        type: 'approve' as const, 
        tx: await approveTokenForSwap(
          inputToken,
          amountIn,
          recipientAddress,
          inputTokenDecimals
        )
      };
    }

    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

    // First get the quote
    const quoteAmount = await getQuoteExactInput(
      inputToken,
      inputTokenDecimals,
      outputToken,
      amountIn,
      fee,
      outputTokenDecimals
    );

    // Calculate minimum output using slippage on the quoted amount
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    console.log('Swap Parameters:', {
      amountIn,
      amountInSmallestUnit,
      quoteAmount: quoteAmount.toString(),
      slippageBasisPoints,
      slippagePercent,
      outputMinInTokens
    });

    // Check token association first
    const isAssociated = await checkTokenAssociation(recipientAddress, outputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, outputToken) };
    }

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams matching the contract exactly
    const params = {
      path: path,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTokens
    };

    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [[swapEncoded]]);

    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setPayableAmount(new Hbar(0))
      .setGas(5000000)
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return { type: 'swap' as const, tx: transactionToBase64String(transaction) };
  } catch (error) {
    console.error("Error in swapTokenToToken:", error);
    throw error;
  }
}; 