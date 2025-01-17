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
  outputTokenDecimals: number,
  useWhbarPath: boolean = false
) => {
  try {
    // Check output token association first
    const isAssociated = await checkTokenAssociation(recipientAddress, outputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, outputToken) };
    }

    // Parse amount to tinybars
    const amountInSmallestUnit = Hbar.from(amountIn, HbarUnit.Hbar).toTinybars().toString();
    
    // Get quote with potential WHBAR path
    const quoteAmount = await getQuoteExactInput(
      WHBAR_ID,
      8, // WHBAR decimals
      outputToken,
      amountIn,
      fee,
      outputTokenDecimals,
      useWhbarPath
    );

    // Calculate minimum output using slippage
    const slippagePercent = slippageBasisPoints / 10000;
    const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

    console.log('Swap Parameters:', {
      amountIn,
      amountInSmallestUnit,
      quoteAmount: quoteAmount.toString(),
      slippageBasisPoints,
      slippagePercent,
      outputMinInTokens,
      useWhbarPath
    });

    // Construct path based on routing type
    const pathData = useWhbarPath ? [
      // WHBAR -> WHBAR -> Token path
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ] : [
      // Direct WHBAR -> Token path
      Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ];

    const path = Buffer.concat(pathData);

    // Construct swap parameters
    const params = {
      path: path,
      recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + deadline,
      amountIn: amountInSmallestUnit,
      amountOutMinimum: outputMinInTokens
    };

    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);

    let encodedData;
    if (useWhbarPath) {
      const multiCallParam = [swapEncoded];
      encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);
    } else {
      encodedData = swapEncoded;
    }

    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setGas(useWhbarPath ? 3_000_000 : 1_000_000)
      .setPayableAmount(new Hbar(amountIn))
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
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