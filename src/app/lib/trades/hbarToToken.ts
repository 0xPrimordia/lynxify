import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, AccountId, HbarUnit } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { WHBAR_ID, SWAP_ROUTER_ADDRESS } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAssociation, associateToken } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../quoter';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapHbarToToken = async (
  amountIn: string,
  outputToken: string,
  fee: number,
  recipientAddress: string,
  deadline: number,
  slippageBasisPoints: number,
  outputTokenDecimals: number
) => {
  try {
    // Validate input
    const parsedAmount = Number(amountIn);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Parse amount to tinybars
    const hbarAmount = Hbar.from(parsedAmount, HbarUnit.Hbar);
    const amountInSmallestUnit = hbarAmount.toTinybars().toString(); // Convert Long to string
    
    // Get quote
    const quoteAmount = await getQuoteExactInput(
      WHBAR_ID,
      8, // WHBAR decimals
      outputToken,
      amountIn,
      fee,
      outputTokenDecimals
    );

    // Calculate minimum output using slippage
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    // Construct path - convert to hex string for ethers.js
    const whbarAddress = ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', '');
    const feeHex = fee.toString(16).padStart(6, '0');
    const outputAddress = ContractId.fromString(outputToken).toSolidityAddress().replace('0x', '');
    const pathHex = `0x${whbarAddress}${feeHex}${outputAddress}`;

    // ExactInputParams
    const params = {
      path: pathHex, // Use hex string instead of Buffer
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: deadline,
      amountIn: amountInSmallestUnit, // String representation of the Long
      amountOutMinimum: outputMinInTokens
    };

    // Create swap calls
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const refundEncoded = swapRouterAbi.encodeFunctionData('refundETH', []);

    const multiCallParam = [swapEncoded, refundEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    // Create the transaction
    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(3_000_000)
      .setPayableAmount(hbarAmount) // Use the Hbar object directly
      .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return { 
      type: 'swap' as const, 
      tx: transactionToBase64String(transaction)
    };
  } catch (error) {
    console.error('Error in swapHbarToToken:', error);
    throw error;
  }
}; 