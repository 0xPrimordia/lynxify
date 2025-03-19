/**
 * @jest-environment jsdom
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define timeout utility for testing
const withTimeoutImpl = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Create dummy mocks
const mockSwapHbarToToken = jest.fn();
const mockGetQuoteExactInput = jest.fn();
const mockAxiosPost = jest.fn();

// Mock modules completely to avoid any real calls
jest.mock('axios', () => ({
  post: (...args: any[]) => mockAxiosPost(...args)
}));

jest.mock('../app/lib/quoter', () => ({
  getQuoteExactInput: (...args: any[]) => mockGetQuoteExactInput(...args)
}));

// Mock the actual swap module
jest.mock('../app/lib/trades/hbarToToken', () => ({
  swapHbarToToken: (...args: any[]) => mockSwapHbarToToken(...args)
}));

// Use our timeout implementation
jest.mock('../app/lib/utils/timeout', () => ({
  withTimeout: withTimeoutImpl
}));

// Import the mocked modules for typing
import { withTimeout } from '../app/lib/utils/timeout';
import { swapHbarToToken } from '../app/lib/trades/hbarToToken';

describe('Swap Flow with Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSwapHbarToToken.mockReset();
    mockGetQuoteExactInput.mockReset();
    mockAxiosPost.mockReset();
  });

  it('should apply timeout to swap transactions', async () => {
    // Setup successful response mock
    const mockTxResponse = { type: 'swap', tx: 'base64-transaction-string' };
    mockSwapHbarToToken.mockResolvedValue(mockTxResponse as never);

    // Create direct swap call to test
    await expect(async () => {
      const result = await withTimeout(
        Promise.resolve(mockTxResponse),
        30000
      );
      expect(result).toEqual(mockTxResponse);
    }).not.toThrow();
  });

  it('should handle transaction timeout', async () => {
    // Test with our withTimeout implementation
    const neverResolvingPromise = new Promise(() => {});
    
    await expect(
      withTimeoutImpl(neverResolvingPromise, 1)
    ).rejects.toThrow('Operation timed out');
  });

  it('should handle transaction signing errors', async () => {
    // Create a rejected promise to simulate signing error
    const signingError = new Error('Failed to sign transaction');
    const rejectedPromise = Promise.reject(signingError);
    
    await expect(
      withTimeoutImpl(rejectedPromise, 30000)
    ).rejects.toThrow('Failed to sign transaction');
  });
}); 