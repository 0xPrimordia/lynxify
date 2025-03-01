// src/app/lib/trades/__tests__/hbarToToken.test.ts

import { swapHbarToToken } from '../hbarToToken';
import { Hbar, HbarUnit, Long } from '@hashgraph/sdk';
import { ethers } from 'ethers';

// Clear any global mocks that might interfere with our tests
jest.unmock('@/app/lib/trades/hbarToToken');

// Mock dependencies
jest.mock('@hashgraph/sdk', () => {
  const original = jest.requireActual('@hashgraph/sdk');
  return {
    ...original,
    Hbar: {
      from: jest.fn().mockImplementation((amount, unit) => ({
        toTinybars: () => new original.Long(1000000000, 0, false), // Simulate 10 HBAR
        toString: () => amount.toString()
      }))
    },
    ContractId: {
      fromString: jest.fn().mockReturnValue({
        toSolidityAddress: () => '0x0000000000000000000000000000000000000001'
      })
    },
    AccountId: {
      fromString: jest.fn().mockReturnValue({
        toSolidityAddress: () => '0x0000000000000000000000000000000000000002'
      })
    },
    TransactionId: {
      generate: jest.fn().mockReturnValue('mock-transaction-id')
    },
    ContractExecuteTransaction: jest.fn().mockImplementation(() => ({
      setContractId: jest.fn().mockReturnThis(),
      setGas: jest.fn().mockReturnThis(),
      setPayableAmount: jest.fn().mockReturnThis(),
      setFunctionParameters: jest.fn().mockReturnThis(),
      setTransactionId: jest.fn().mockReturnThis()
    }))
  };
});

jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  transactionToBase64String: jest.fn().mockReturnValue('mock-base64-transaction')
}));

jest.mock('../../quoter', () => ({
  getQuoteExactInput: jest.fn().mockResolvedValue('2000000000') // Mock quote result
}));

describe('swapHbarToToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle Long objects from toTinybars() correctly', async () => {
    // Spy on ethers.js encodeFunctionData to check what values are passed
    const encodeSpy = jest.spyOn(ethers.Interface.prototype, 'encodeFunctionData');
    
    const result = await swapHbarToToken(
      '10',                    // 10 HBAR
      '0.0.1234567',           // Output token
      3000,                    // Fee
      '0.0.1111111',           // Recipient
      Math.floor(Date.now() / 1000) + 60, // Deadline
      50,                      // Slippage (0.5%)
      8                        // Output token decimals
    );
    
    // Check that the transaction was created successfully
    expect(result).toEqual({
      type: 'swap',
      tx: 'mock-base64-transaction'
    });
    
    // Verify that encodeFunctionData was called with proper parameters
    expect(encodeSpy).toHaveBeenCalled();
    
    // Check the parameters passed to exactInput
    const exactInputParams = encodeSpy.mock.calls.find(call => call[0] === 'exactInput');
    expect(exactInputParams).toBeDefined();
    
    if (exactInputParams && exactInputParams[1] && exactInputParams[1][0]) {
      const params = exactInputParams[1][0];
      // Verify amountIn is a string or number, not a Long object
      expect(typeof params.amountIn === 'string' || typeof params.amountIn === 'number').toBe(true);
      // If it's a string, it should be parseable as a number
      if (typeof params.amountIn === 'string') {
        expect(isNaN(Number(params.amountIn))).toBe(false);
      }
      // Verify path is a hex string, not a Buffer
      expect(typeof params.path === 'string').toBe(true);
      expect(params.path.startsWith('0x')).toBe(true);
    }
  });

  it('should reject invalid HBAR amounts', async () => {
    // Override the mock for this specific test
    const hbarFromMock = jest.spyOn(Hbar, 'from');
    
    // First, let the validation fail naturally
    await expect(swapHbarToToken(
      'not-a-number',
      '0.0.1234567',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    )).rejects.toThrow('Amount must be greater than zero');
    
    // Then test with a specific error
    hbarFromMock.mockImplementationOnce(() => {
      throw new Error('Invalid HBAR amount');
    });
    
    await expect(swapHbarToToken(
      '10',  // Valid number but mock will throw
      '0.0.1234567',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    )).rejects.toThrow('Invalid HBAR amount');
  });

  it('should handle zero and very small amounts correctly', async () => {
    // Mock Hbar.from to return different values for different inputs
    const hbarFromMock = jest.spyOn(Hbar, 'from');
    
    // For zero amount - validation should catch this before Hbar.from is called
    await expect(swapHbarToToken(
      '0',
      '0.0.1234567',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    )).rejects.toThrow(/amount must be greater than zero/i);
    
    // For very small amount (0.000001 HBAR = 100 tinybars)
    const mockLong = new Long(100, 0, false);
    hbarFromMock.mockImplementationOnce(() => {
      return {
        toTinybars: () => mockLong,
        toString: () => '0.000001'
      } as unknown as Hbar;
    });
    
    const result = await swapHbarToToken(
      '0.000001',
      '0.0.1234567',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    );
    
    expect(result).toEqual({
      type: 'swap',
      tx: 'mock-base64-transaction'
    });
  });
  
  it('should handle Long objects correctly in ethers.js functions', async () => {
    // Create a real Long object to test with
    const longValue = new Long(1000000000, 0, false);
    
    // Mock Hbar.from to return our test Long object
    jest.spyOn(Hbar, 'from').mockImplementationOnce(() => {
      return {
        toTinybars: () => longValue,
        toString: () => '10'
      } as unknown as Hbar;
    });
    
    // Spy on ethers.js encodeFunctionData
    const encodeSpy = jest.spyOn(ethers.Interface.prototype, 'encodeFunctionData');
    
    await swapHbarToToken(
      '10',
      '0.0.1234567',
      3000,
      '0.0.1111111',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    );
    
    // Check the parameters passed to exactInput
    const exactInputParams = encodeSpy.mock.calls.find(call => call[0] === 'exactInput');
    expect(exactInputParams).toBeDefined();
    
    if (exactInputParams && exactInputParams[1] && exactInputParams[1][0]) {
      const params = exactInputParams[1][0];
      // The key test: verify the Long object was properly converted to a string
      expect(params.amountIn).toBe(longValue.toString());
    }
  });
});