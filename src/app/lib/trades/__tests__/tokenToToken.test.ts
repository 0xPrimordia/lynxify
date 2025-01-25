import { ContractId, AccountId, Transaction, Client, PrivateKey, ContractExecuteTransaction, ContractFunctionParameters } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';
import { swapTokenToToken } from '../tokenToToken';
import { SWAP_ROUTER_ADDRESS } from '../../constants';
import dotenv from "dotenv";

// Setup environment
dotenv.config({ path: '.env.local' });

// Mock the problematic ES module
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  transactionToBase64String: (transaction: any) => 
    Buffer.from(transaction.toBytes()).toString('base64')
}));

// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
  throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}

let client: Client;

// Mock token utilities to simulate both approval and swap flows
jest.mock('../../utils/tokens', () => ({
  checkTokenAllowance: jest.fn().mockImplementation(async (recipientAddress, tokenId, routerAddress, amount, decimals) => {
    // Return false for approval test case exact values
    if (amount === "10000000000" && decimals === 6) {
      return false;
    }
    return true;
  }),
  approveTokenForSwap: jest.fn().mockImplementation(async (tokenId, amount, recipientAddress, decimals) => {
    const routerAddress = ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress();
    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(tokenId))
      .setGas(1_000_000)
      .setFunction("approve", new ContractFunctionParameters()
        .addAddress(routerAddress)
        .addUint256((Number(amount) * Math.pow(10, decimals)).toString()));
    
    return {
      type: 'approve' as const,
      tx: Buffer.from(tx.toBytes()).toString('base64')
    };
  }),
  checkTokenAssociation: jest.fn().mockResolvedValue(true),
  associateToken: jest.fn().mockResolvedValue({
    type: 'associate',
    tx: Buffer.from(new ContractExecuteTransaction().toBytes()).toString('base64')
  })
}));

jest.mock('../../saucerswap', () => ({
  getQuoteExactInput: jest.fn().mockResolvedValue('9000000000')
}));

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToToken full flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );
  });

  it('should handle full swap flow', async () => {
    const result = await swapTokenToToken(
      "10000.123456",
      "0.0.1183558",
      "0.0.1234567",
      3000,
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      Math.floor(Date.now() / 1000) + 60,
      9000,
      6,
      6
    );

    expect(result.type).toBe('swap');
    expect(result.tx).toBeDefined();
  });

  it('should handle token approval flow', async () => {
    const result = await swapTokenToToken(
      "10000",
      "0.0.1183558",
      "0.0.1234567",
      3000,
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      Math.floor(Date.now() / 1000) + 60,
      9000,
      6,
      6
    );

    expect(result.type).toBe('approve');
    expect(result.tx).toBeDefined();
  });

  it('should properly handle token amounts and decimals', async () => {
    const { checkTokenAllowance } = require('../../utils/tokens');
    checkTokenAllowance.mockResolvedValueOnce(true);  // Force swap flow

    const result = await swapTokenToToken(
      "10000.123456",
      "0.0.1183558",
      "0.0.1234567",
      3000,
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      Math.floor(Date.now() / 1000) + 60,
      9000,
      6,
      8
    );

    expect(result.type).toBe('swap');
    expect(result.tx).toBeDefined();
  });
});

describe('tokenToToken error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle numeric string amounts correctly', async () => {
    const { checkTokenAllowance } = require('../../utils/tokens');
    
    const result = await swapTokenToToken(
      "10000",
      "0.0.1183558",
      "0.0.1234567",
      3000,
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      Math.floor(Date.now() / 1000) + 60,
      9000,
      6,
      6
    );

    expect(checkTokenAllowance).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      "0.0.1183558",
      expect.any(String),
      "10000000000",  // Check the converted amount
      6
    );
  });

  it('should fail on hex string amounts', async () => {
    await expect(swapTokenToToken(
      "0x1234",
      "0.0.1183558",
      "0.0.1234567",
      3000,
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
      Math.floor(Date.now() / 1000) + 60,
      9000,
      6,
      6
    )).rejects.toThrow('Amount cannot be in hex format');
  });
}); 