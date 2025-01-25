import { ContractExecuteTransaction, TransactionId, TokenAssociateTransaction, AccountId, ContractId, ContractFunctionParameters } from '@hashgraph/sdk';
import { AbiCoder } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import axios from 'axios';
import { SWAP_ROUTER_ADDRESS } from '../constants';

export const checkTokenAllowance = async (
  recipientAddress: string,
  tokenId: string,
  routerAddress: string,
  amount: string,
  decimals: number
) => {
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/contracts/call`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          block: "latest",
          estimate: false,
          from: AccountId.fromString(recipientAddress).toSolidityAddress(),
          to: ContractId.fromString(tokenId).toSolidityAddress(),
          gas: 30000,
          data: `0xdd62ed3e${AccountId.fromString(recipientAddress).toSolidityAddress().padStart(64, '0')}${ContractId.fromString(routerAddress).toSolidityAddress().padStart(64, '0')}`
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    
    // Remove '0x' prefix if present and convert hex to decimal string
    const allowanceHex = data.result.replace('0x', '');
    const allowanceDecimal = BigInt('0x' + allowanceHex).toString();
    
    return BigInt(allowanceDecimal) >= BigInt(amount);
  } catch (error) {
    console.error('Error checking token allowance:', error);
    return false;
  }
};

export const approveTokenForSwap = async (
  tokenId: string, 
  amount: string, 
  recipientAddress: string, 
  tokenDecimals: number
) => {
  try {
    const amountInSmallestUnit = (Number(amount) * Math.pow(10, tokenDecimals)).toString();
    
    const transaction = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(tokenId))
      .setGas(1_000_000)
      .setFunction(
        "approve",
        new ContractFunctionParameters()
          .addAddress(ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress())
          .addUint256(amountInSmallestUnit)
      )
      .setTransactionId(TransactionId.generate(recipientAddress));

    return transactionToBase64String(transaction);
  } catch (error) {
    console.error("Error in approveTokenForSwap:", error);
    throw error;
  }
};

export const checkTokenAssociation = async (accountId: string, tokenId: string) => {
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
    );
    const data = await response.json();
    return data.tokens && data.tokens.length > 0;
  } catch (error) {
    console.error('Error checking token association:', error);
    return false;
  }
};

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

export const getTokenImageUrl = (iconPath: string) => {
    if (!iconPath) return '';
    
    // If it's a cloudfront URL, use it directly
    if (iconPath.includes('cloudfront.net')) {
        return iconPath;
    }
    
    // If it's a relative path, append it to the base URL
    if (iconPath.startsWith('/')) {
        return `https://www.saucerswap.finance${iconPath}`;
    }
    
    // If it's already a full URL, return as is
    if (iconPath.startsWith('http')) {
        return iconPath;
    }
    
    // Default case, assume it's a relative path
    return `https://www.saucerswap.finance/${iconPath}`;
}; 