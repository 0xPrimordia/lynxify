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
    // Parse amount to tinybars
    const amountInSmallestUnit = Hbar.from(Number(amountIn), HbarUnit.Hbar).toTinybars();
    
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

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
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

    // Create swap calls
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const refundEncoded = swapRouterAbi.encodeFunctionData('refundETH', []);

    const multiCallParam = [swapEncoded, refundEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    // Create the transaction
    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(3_000_000)
      .setPayableAmount(Hbar.from(Number(amountIn), HbarUnit.Hbar))
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