import { 
  ContractId, 
  ContractExecuteTransaction, 
  AccountId, 
  Hbar, 
  HbarUnit,
  TransactionId
} from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { WHBAR_ID, SWAP_ROUTER_ADDRESS } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAssociation, associateToken, approveTokenForSwap, checkTokenAllowance } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../quoter';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapTokenToHbar = async (
  amountIn: string,
  inputToken: string,
  fee: number,
  recipientAddress: string,
  deadline: number,
  slippageBasisPoints: number,
  inputTokenDecimals: number
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
      WHBAR_ID,
      amountIn,
      fee,
      8  // WHBAR decimals
    );

    // Calculate minimum output using slippage on the quoted amount
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTinybars = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    console.log('Swap Parameters:', {
      amountIn,
      amountInSmallestUnit,
      quoteAmount: quoteAmount.toString(),
      slippageBasisPoints,
      slippagePercent,
      outputMinInTinybars
    });

    // Check token association first
    const isAssociated = await checkTokenAssociation(recipientAddress, inputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, inputToken) };
    }

    // Construct path exactly like the test script
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams matching the test script exactly
    const params = {
      path: path,
      recipient: ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTinybars
    };

    // Create swap calls - match test script exactly
    const swapEncoded = '0x' + swapRouterAbi.encodeFunctionData('exactInput', [params]).slice(2);
    const unwrapEncoded = '0x' + swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,  // amount (0 means all)
      AccountId.fromString(recipientAddress).toSolidityAddress()  // Final recipient is the user
    ]).slice(2);

    const multiCallParam = [swapEncoded, unwrapEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(3_000_000)
      .setPayableAmount(new Hbar(0))
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
      .setTransactionId(TransactionId.generate(recipientAddress));

    return {
      type: 'swap' as const,
      tx: transactionToBase64String(transaction)
    };

  } catch (error: any) {
    console.error('Error in swapTokenToHbar:', error);
    throw error;
  }
}; 