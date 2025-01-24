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
    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

    // Get quote
    const quoteAmount = await getQuoteExactInput(
      inputToken,
      inputTokenDecimals,
      WHBAR_ID,
      amountIn,
      fee,
      8  // WHBAR decimals
    );

    // Calculate minimum output using slippage
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTinybars = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams
    const params = {
      path: path,
      recipient: ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress(),
      deadline: deadline,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTinybars
    };

    const swapEncoded = '0x' + swapRouterAbi.encodeFunctionData('exactInput', [params]).slice(2);
    const unwrapEncoded = '0x' + swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,  // amount (0 means all)
      AccountId.fromString(recipientAddress).toSolidityAddress()
    ]).slice(2);

    return { type: 'swap' as const, tx: swapRouterAbi.encodeFunctionData('multicall', [[swapEncoded, unwrapEncoded]]) };
  } catch (error) {
    console.error('Error in swapTokenToHbar:', error);
    throw error;
  }
}; 