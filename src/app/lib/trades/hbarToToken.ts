import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { WHBAR_ID, SWAP_ROUTER_ADDRESS } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAssociation, associateToken } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapHbarToToken = async (
  amountIn: string,
  outputToken: string,
  fee: number,
  recipientAddress: string,
  deadline: number,
  outputAmountMin: number
) => {
  try {
    // Check output token association first
    const isAssociated = await checkTokenAssociation(recipientAddress, outputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, outputToken) };
    }

    // Parse amount (HBAR uses 8 decimals)
    const amountInSmallestUnit = (Number(amountIn) * 1e8).toString();

    // Construct path exactly like the working example but with WHBAR
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams matching the contract exactly
    const params = {
      path: path,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputAmountMin
    };

    // Create swap calls - include refundETH for HBAR swaps
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const refundHBAREncoded = swapRouterAbi.encodeFunctionData('refundETH');
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [[swapEncoded, refundHBAREncoded]]);

    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setPayableAmount(Hbar.fromTinybars(amountInSmallestUnit))  // Required for HBAR swaps
      .setGas(5000000)
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return { type: 'swap' as const, tx: transactionToBase64String(transaction) };
  } catch (error) {
    console.error("Error in swapHbarToToken:", error);
    throw error;
  }
}; 