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
      `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
    );
    const data = await response.json();
    console.log('Token association check response:', {
      accountId,
      tokenId,
      response: data
    });
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
    // Check both token associations
    const [isWhbarAssociated, isOutputAssociated] = await Promise.all([
      checkTokenAssociation(recipientAddress, inputToken),
      checkTokenAssociation(recipientAddress, outputToken)
    ]);

    console.log('Token association status:', {
      input: isWhbarAssociated,
      output: isOutputAssociated
    });

    // Handle token associations if needed
    if (!isWhbarAssociated) {
      console.log('Input token not associated, creating association');
      return await associateToken(recipientAddress, inputToken);
    }

    if (!isOutputAssociated) {
      console.log('Output token not associated, creating association');
      return await associateToken(recipientAddress, outputToken);
    }

    const amountInTinybar = ethers.parseUnits(amountIn, 8).toString();
    
    // Construct the path using provided tokens and fee
    const pathData: string[] = [];
    pathData.push(ContractId.fromString(inputToken).toSolidityAddress().padStart(40, '0'));
    pathData.push(decimalToPaddedHex(fee, 6));
    pathData.push(ContractId.fromString(outputToken).toSolidityAddress().padStart(40, '0'));

    // ExactInputParams for the swap
    const params = {
      path: `0x${pathData.join('')}`,
      recipient: `0x${AccountId.fromString(recipientAddress).toSolidityAddress()}`,
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: amountInTinybar,
      amountOutMinimum: 0
    };

    console.log("Path components:", {
      inputToken,
      fee,
      outputToken,
      constructedPath: pathData.join('')
    });

    // Create both the swap and unwrap calls
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const unwrapEncoded = swapRouterAbi.encodeFunctionData('unwrapWHBAR', [0, `0x${AccountId.fromString(recipientAddress).toSolidityAddress()}`]);
    
    // Combine them in a multicall
    const multiCallParam = [swapEncoded, unwrapEncoded];
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

export const getQuoteExactInput = async (inputToken: string, inputTokenDecimals: number, outputToken: string, amountIn: string, fee: number, outputTokenDecimals: number) => {
    try {
        const path = Buffer.concat([
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().slice(2).padStart(40, '0'), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().slice(2).padStart(40, '0'), 'hex')
        ]);

        const inputAmountInSmallestUnit = inputToken === '0.0.15058' 
            ? (Number(amountIn) * 1e8).toString()
            : (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        let mirrorNodeBaseUrl = `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
        
        const data = {
            'block': 'latest',
            'data': abiInterfaces.encodeFunctionData('quoteExactInput', [path, inputAmountInSmallestUnit]),
            'to': `0x${ContractId.fromString(QUOTER_V2_ADDRESS).toSolidityAddress()}`,
        };

        const response = await axios.post(url, data, { headers: {'content-type': 'application/json'} });
        const result = abiInterfaces.decodeFunctionResult('quoteExactInput', response.data.result); 
        return result.amountOut;
    } catch (error) {
        console.error("Error in getQuoteExactInput:", error);
        throw error;
    }
}