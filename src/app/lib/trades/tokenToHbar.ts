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
    // Parse amount with proper decimals
    const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();
    
    // Calculate minimum output with 1% slippage if none provided
    const outputMinInTinybars = outputAmountMin === 0 
      ? (Number(amountInSmallestUnit) * 0.99).toString() // 1% slippage protection
      : Hbar.from(outputAmountMin, HbarUnit.Hbar).toTinybars().toString();

    console.log('Swap Parameters:', {
      amountIn,
      amountInSmallestUnit,
      outputAmountMin,
      outputMinInTinybars
    });

    // Check token association first
    const isAssociated = await checkTokenAssociation(recipientAddress, inputToken);
    if (!isAssociated) {
      return { type: 'associate' as const, tx: await associateToken(recipientAddress, inputToken) };
    }

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