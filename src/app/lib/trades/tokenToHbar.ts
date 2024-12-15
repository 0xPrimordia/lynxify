import { ContractId, ContractExecuteTransaction, TransactionId, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { WHBAR_ID, SWAP_ROUTER_ADDRESS } from '../constants';
import { checkTokenAllowance, approveTokenForSwap } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { Client } from '@hashgraph/sdk';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapTokenToHbar = async (
  amountIn: string,
  inputToken: string,
  fee: number,
  recipientAddress: string,
  deadline: number,
  outputAmountMin: number,
  inputTokenDecimals: number
) => {
  try {
    // Check if token is approved for the router
    const isApproved = await checkTokenAllowance(
      inputToken,
      recipientAddress,
      SWAP_ROUTER_ADDRESS,
      amountIn,
      inputTokenDecimals
    );

    if (!isApproved) {
      return { 
        type: 'approval' as const, 
        tx: await approveTokenForSwap(
          inputToken,
          amountIn,
          recipientAddress,
          inputTokenDecimals
        )
      };
    }

    // Parse amount based on input token decimals
    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();
    
    // Convert output min to Tinybars (HBAR's smallest unit)
    const outputMinInTinybars = (Number(outputAmountMin) * 1e8).toString();

    // Construct path with output token (WHBAR) first as specified in docs
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams matching docs exactly
    const params = {
      path: path,
      recipient: ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTinybars
    };

    // Create swap calls - match docs exactly
    const swapEncoded = '0x' + swapRouterAbi.encodeFunctionData('exactInput', [params]).slice(2);
    const unwrapEncoded = '0x' + swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,
      AccountId.fromString(recipientAddress).toSolidityAddress()
    ]).slice(2);
    const multiCallParam = [swapEncoded, unwrapEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    console.log('Contract Call Data:', {
        exactInputParams: params,
        encodedExactInput: swapEncoded,
        encodedUnwrap: unwrapEncoded,
        fullEncodedData: encodedData
    });

    // Get encoded data as Uint8Array exactly as shown in docs
    const encodedDataAsUint8Array = Buffer.from(encodedData.slice(2), 'hex');

    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(5000000)
      .setFunctionParameters(encodedDataAsUint8Array)
      .setTransactionId(TransactionId.generate(recipientAddress));

    return { type: 'swap' as const, tx: transactionToBase64String(transaction) };
  } catch (error) {
    console.error("Error in swapTokenToHbar:", error);
    throw error;
  }
}; 