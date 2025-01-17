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
  inputTokenDecimals: number,
  useWhbarPath: boolean = false
) => {
  try {
    // Check token associations first
    const isAssociated = await checkTokenAssociation(recipientAddress, inputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, inputToken) };
    }

    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

    // Get quote with potential WHBAR path
    const quoteAmount = await getQuoteExactInput(
      inputToken,
      inputTokenDecimals,
      WHBAR_ID,
      amountIn,
      fee,
      8,  // WHBAR decimals
      useWhbarPath
    );

    // Calculate minimum output using slippage
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTinybars = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    console.log('Swap Parameters:', {
      amountIn,
      amountInSmallestUnit,
      quoteAmount: quoteAmount.toString(),
      slippageBasisPoints,
      slippagePercent,
      outputMinInTinybars,
      useWhbarPath
    });

    // Construct path based on routing type
    const pathData = useWhbarPath ? [
      // Token -> WHBAR -> WHBAR path
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex')
    ] : [
      // Direct path
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex')
    ];

    const path = Buffer.concat(pathData);

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
      .setGas(useWhbarPath ? 4_000_000 : 3_000_000)  // Increase gas for indirect path
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