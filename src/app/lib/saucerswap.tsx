import { ethers } from 'ethers';
import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, HbarUnit, TokenAssociateTransaction, Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import QuoterV2Abi from './QuoterV2.json';
import SwapRouterAbi from './SwapRouter.json';
import UniswapV3FactoryAbi from './UniswapV3Factory.json';
import axios from 'axios';
import {
  transactionToBase64String
} from '@hashgraph/hedera-wallet-connect'

//load ABI data 
const abiInterfaces = new ethers.Interface(QuoterV2Abi);
const QUOTER_V2_ADDRESS = process.env.NEXT_PUBLIC_QUOTER_V2_ADDRESS as string;
const swapRouterAbi = new ethers.Interface(SwapRouterAbi);
const SWAP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS as string;

//helper functions
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}

function decimalToPaddedHex(decimal: number, length: number): string {
  let hexString = decimal.toString(16);
  while (hexString.length < length) {
      hexString = '0' + hexString;
  }
  return hexString;
}

// Add new function to check token association
export const checkTokenAssociation = async (accountId: string, tokenId: string) => {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
    );
    const data = await response.json();
    return data.tokens && data.tokens.length > 0;
  } catch (error) {
    console.error('Error checking token association:', error);
    return false;
  }
};

// Add function to handle token association
export const associateToken = async (accountId: string, tokenId: string) => {
  try {
    const transaction = await new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .setTransactionId(TransactionId.generate(accountId));

    return transactionToBase64String(transaction);
  } catch (error) {
    console.error('Error creating token association transaction:', error);
    throw error;
  }
};

export const swapExactTokenForToken = async (amountIn: string, inputToken: string, outputToken: string, fee: number, recipientAddress: string, deadline: number, outputAmountMin: number) => {
  try {
    console.log("Swap Input Parameters:", {
      amountIn, inputToken, outputToken, fee, recipientAddress, deadline, outputAmountMin,
      network: process.env.NEXT_PUBLIC_HEDERA_NETWORK
    });

    // First check if token association
    const isAssociated = await checkTokenAssociation(recipientAddress, outputToken);
    if (!isAssociated) {
      console.log('Token not associated, creating association transaction');
      return await associateToken(recipientAddress, outputToken);
    }

    const amountInTinybar = ethers.parseUnits(amountIn, 8).toString();
    
    // Construct the path data with proper formatting
    const pathData: string[] = [];
    // Output token (20 bytes)
    pathData.push(ContractId.fromString(outputToken).toSolidityAddress().padStart(40, '0'));
    // Fee (3 bytes)
    pathData.push(decimalToPaddedHex(fee, 6));
    // Input token (20 bytes)
    pathData.push(ContractId.fromString(inputToken).toSolidityAddress().padStart(40, '0'));

    // ExactInputParams
    const params = {
      path: `0x${pathData.join('')}`,  // This should now be 43 bytes in reverse order
      recipient: `0x${AccountId.fromString(recipientAddress).toSolidityAddress()}`,
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInTinybar,
      amountOutMinimum: 0
    };

    console.log("Swap Parameters:", params);

    // Encode the swap and refund functions
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const refundHBAREncoded = swapRouterAbi.encodeFunctionData('refundETH', []);
    const multiCallParam = [swapEncoded, refundHBAREncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    console.log("Encoded transaction data:", {
      params,
      encodedData
    });

    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
      .setPayableAmount(Hbar.fromTinybars(amountInTinybar))
      .setGas(1000000)
      .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
      .setTransactionId(TransactionId.generate(recipientAddress));

    console.log("Transaction details:", {
      network: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
      gasLimit: 1000000,
      recipientAddress,
      router: SWAP_ROUTER_ADDRESS,
      transactionId: transaction.transactionId?.toString()
    });

    const transactionList = transactionToBase64String(transaction);
    return transactionList;
  } catch (error) {
    console.error("Error in swapExactTokenForToken:", error);
    throw error;
  }
};

export const getQuoteExactInput = async (inputToken: string, inputTokenDecimals: number, outputToken: string, amountIn: string, fee: number) => {
  const pathData:string[] = [];
  pathData.push(`0x${ContractId.fromString(inputToken).toSolidityAddress()}`); 
  pathData.push(decimalToPaddedHex(fee, 6));
  pathData.push(`${ContractId.fromString(outputToken).toSolidityAddress()}`);
  console.log(pathData.join(''));
  const encodedPathData = hexToUint8Array(pathData.join(''));
  const inputAmountInSmallestUnit = ethers.parseUnits(amountIn, inputTokenDecimals);
  let mirrorNodeBaseUrl = `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com`;
  const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
  const params = [encodedPathData, inputAmountInSmallestUnit];
  const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactInput')!, params);

  const data = {
    'block': 'latest',
    'data': encodedData,
    'to': `0x${ContractId.fromString(QUOTER_V2_ADDRESS).toSolidityAddress()}`,
  };

  try {
    const response = await axios.post(url, data, { headers: {'content-type': 'application/json'} });
    const result = abiInterfaces.decodeFunctionResult('quoteExactInput', response.data.result); 
    const finalAmountOut = result.amountOut; //in token's smallest unit
    return finalAmountOut;
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
}