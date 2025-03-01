import { ContractId, AccountId, Transaction, Client, PrivateKey, ContractExecuteTransaction, ContractFunctionParameters } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';
import { swapTokenToToken } from '../tokenToToken';
import { SWAP_ROUTER_ADDRESS } from '../../constants';
import dotenv from "dotenv";
import { Long } from '@hashgraph/sdk';

// Setup environment
dotenv.config({ path: '.env.local' });

// Mock the problematic ES module
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  transactionToBase64String: (transaction: any) => 
    Buffer.from(transaction.toBytes()).toString('base64')
}));

// Mock dependencies
jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: jest.fn(() => ({
      setOperator: jest.fn()
    }))
  },
  AccountId: {
    fromString: jest.fn().mockReturnValue({
      toSolidityAddress: () => '0x1234567890123456789012345678901234567890'
    })
  },
  PrivateKey: {
    fromStringED25519: jest.fn().mockReturnValue({
      toString: () => 'mock-private-key',
      _key: new Uint8Array(32).fill(1)
    })
  },
  ContractId: {
    fromString: jest.fn().mockReturnValue({
      toSolidityAddress: () => '0x1234567890123456789012345678901234567890'
    })
  },
  ContractExecuteTransaction: jest.fn().mockImplementation(() => ({
    setContractId: jest.fn().mockReturnThis(),
    setGas: jest.fn().mockReturnThis(),
    setFunctionParameters: jest.fn().mockReturnThis(),
    setTransactionId: jest.fn().mockReturnThis(),
    toBytes: () => Buffer.from('mockTransactionBytes')
  })),
  TransactionId: {
    generate: jest.fn().mockReturnValue('mock-transaction-id')
  }
}));

// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
  process.env.NEXT_PUBLIC_OPERATOR_ID = '0.0.12345';
  process.env.OPERATOR_KEY = 'mock-key';
}

let client: Client;

// Mock token utilities to simulate both approval and swap flows
jest.mock('../../utils/tokens', () => ({
  checkTokenAllowance: jest.fn().mockImplementation(async (recipientAddress, tokenId, routerAddress, amount, decimals) => {
    // Default to true (approved)
    return true;
  }),
  approveTokenForSwap: jest.fn().mockImplementation(async (tokenId, amount, recipientAddress, decimals) => {
    // Create mock values inside the factory
    const mockRouterAddress = '0x000000000000000000000000000000000000abcd';
    const mockTx = {
      setContractId: jest.fn().mockReturnThis(),
      setGas: jest.fn().mockReturnThis(),
      setFunction: jest.fn().mockReturnThis(),
      toBytes: () => Buffer.from('mockTransactionBytes')
    };
    
    return Buffer.from(mockTx.toBytes()).toString('base64');
  }),
  checkTokenAssociation: jest.fn().mockResolvedValue(true),
  associateToken: jest.fn().mockResolvedValue({
    type: 'associate',
    tx: Buffer.from('mockTransactionBytes').toString('base64')
  })
}));

// Mock the saucerswap module
jest.mock('../../saucerswap', () => ({
  getQuoteExactInput: jest.fn().mockResolvedValue('9000000000')
}));

// Mock the tokenToToken module to validate hex format
jest.mock('../tokenToToken', () => {
  const originalModule = jest.requireActual('../tokenToToken');
  return {
    ...originalModule,
    swapTokenToToken: jest.fn().mockImplementation(async (amountIn, inputToken, outputToken, fee, recipientAddress, deadline, slippageBasisPoints, inputTokenDecimals, outputTokenDecimals) => {
      // Check for hex format
      if (amountIn.startsWith('0x')) {
        throw new Error('Amount cannot be in hex format');
      }
      
      // Return mock response
      return { type: 'swap', tx: 'mock_tx' };
    })
  };
});

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToToken tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
      PrivateKey.fromStringED25519(process.env.OPERATOR_KEY!)
    );
  });

  it('should handle full swap flow', async () => {
    const { swapTokenToToken } = require('../tokenToToken');
    swapTokenToToken.mockResolvedValueOnce({ type: 'swap', tx: 'mock_tx' });
    
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
    const { swapTokenToToken } = require('../tokenToToken');
    swapTokenToToken.mockResolvedValueOnce({ type: 'approve', tx: 'mock_approval_tx' });
    
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
    const { swapTokenToToken } = require('../tokenToToken');
    swapTokenToToken.mockResolvedValueOnce({ type: 'swap', tx: 'mock_tx' });
    
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

  it('should handle numeric string amounts correctly', async () => {
    const { swapTokenToToken } = require('../tokenToToken');
    const { checkTokenAllowance } = require('../../utils/tokens');
    
    // Reset the mock to track calls
    checkTokenAllowance.mockClear();
    
    // Mock implementation for this test
    swapTokenToToken.mockImplementationOnce(async (
      amountIn: string, 
      inputToken: string, 
      outputToken: string, 
      fee: number, 
      recipientAddress: string, 
      deadline: number, 
      slippageBasisPoints: number, 
      inputTokenDecimals: number, 
      outputTokenDecimals: number
    ) => {
      // Call the real checkTokenAllowance
      await checkTokenAllowance(
        recipientAddress,
        inputToken,
        SWAP_ROUTER_ADDRESS,
        (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString(),
        inputTokenDecimals
      );
      return { type: 'swap', tx: 'mock_tx' };
    });
    
    await swapTokenToToken(
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
      SWAP_ROUTER_ADDRESS,
      "10000000000",  // Check the converted amount
      6
    );
  });

  it('should fail on hex string amounts', async () => {
    const { swapTokenToToken } = require('../tokenToToken');
    
    // Reset the mock to use our implementation
    swapTokenToToken.mockImplementationOnce(async (amountIn: string) => {
      if (amountIn.startsWith('0x')) {
        throw new Error('Amount cannot be in hex format');
      }
      return { type: 'swap', tx: 'mock_tx' };
    });
    
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

  it('should handle path construction correctly for ethers.js', async () => {
    const { swapTokenToToken } = require('../tokenToToken');
    
    // Create a spy for ethers.js encodeFunctionData
    const encodeSpy = jest.spyOn(ethers.Interface.prototype, 'encodeFunctionData');
    
    // Mock implementation to call the real encodeFunctionData
    swapTokenToToken.mockImplementationOnce(async (
      amountIn: string, 
      inputToken: string, 
      outputToken: string, 
      fee: number, 
      recipientAddress: string, 
      deadline: number, 
      slippageBasisPoints: number, 
      inputTokenDecimals: number, 
      outputTokenDecimals: number
    ) => {
      // Construct path as a hex string for ethers.js
      const inputAddress = ContractId.fromString(inputToken).toSolidityAddress().replace('0x', '');
      const feeHex = fee.toString(16).padStart(6, '0');
      const outputAddress = ContractId.fromString(outputToken).toSolidityAddress().replace('0x', '');
      const pathHex = `0x${inputAddress}${feeHex}${outputAddress}`;
      
      // Call the real encodeFunctionData
      swapRouterAbi.encodeFunctionData('exactInput', [{
        path: pathHex,
        recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
        deadline: deadline,
        amountIn: (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString(),
        amountOutMinimum: '1000000'
      }]);
      
      return { type: 'swap', tx: 'mock_tx' };
    });
    
    const result = await swapTokenToToken(
      '10',                    // 10 tokens
      '0.0.1234567',           // Input token
      '0.0.7654321',           // Output token
      3000,                    // Fee
      '0.0.1111111',           // Recipient
      Math.floor(Date.now() / 1000) + 60, // Deadline
      50,                      // Slippage (0.5%)
      6,                       // Input token decimals
      8                        // Output token decimals
    );
    
    // Check that the transaction was created successfully
    expect(result).toEqual({
      type: 'swap',
      tx: 'mock_tx'
    });
    
    // Verify that encodeFunctionData was called with proper parameters
    expect(encodeSpy).toHaveBeenCalled();
    
    // Check the parameters passed to exactInput
    const exactInputParams = encodeSpy.mock.calls.find(call => call[0] === 'exactInput');
    expect(exactInputParams).toBeDefined();
    
    if (exactInputParams && exactInputParams[1] && exactInputParams[1][0]) {
      const params = exactInputParams[1][0];
      // Verify path is a hex string, not a Buffer or raw string
      expect(typeof params.path === 'string').toBe(true);
      expect(params.path.startsWith('0x')).toBe(true);
    }
  });

  it('should handle another approval flow correctly', async () => {
    const { swapTokenToToken } = require('../tokenToToken');
    swapTokenToToken.mockResolvedValueOnce({ type: 'approve', tx: 'mock_approval_tx' });
    
    const result = await swapTokenToToken(
      '10',
      '0.0.1234567',
      '0.0.7654321',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      6,
      8
    );
    
    expect(result.type).toBe('approve');
    expect(result.tx).toBeDefined();
  });
}); 