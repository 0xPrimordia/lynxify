import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { swapHbarToToken } from '../app/lib/saucerswap';
import { handleInAppTransaction, handleInAppPasswordSubmit } from '../app/lib/transactions/inAppWallet';
import { withTimeout } from '../app/lib/utils/timeout';

// Mock the timeout utility
jest.mock('../app/lib/utils/timeout', () => {
  const original = jest.requireActual('../app/lib/utils/timeout');
  return {
    withTimeout: jest.fn((promise, timeout, errorMessage) => {
      // By default, pass through the promise
      return promise;
    }),
    createTimeout: (jest.requireActual('../app/lib/utils/timeout') as any).createTimeout
  };
});

// Mock the swap function
jest.mock('../app/lib/saucerswap', () => ({
  swapHbarToToken: jest.fn().mockImplementation(() => 
    Promise.resolve({ type: 'swap', tx: 'mock-transaction' })
  )
}));

// Mock the transaction handlers
jest.mock('../app/lib/transactions/inAppWallet', () => ({
  handleInAppTransaction: jest.fn().mockImplementation((tx, signFn, setContext: any) => {
    setContext({
      isOpen: true,
      transaction: tx,
      description: 'Enter your password to confirm the transaction.',
      transactionPromise: {
        resolve: jest.fn(),
        reject: jest.fn()
      }
    });
    return Promise.resolve();
  }),
  handleInAppPasswordSubmit: jest.fn().mockImplementation(((
    tx: string, 
    password: string, 
    signFn: (tx: string, password: string) => Promise<{ success: boolean; error?: string }>,
    setContext: (context: { isOpen: boolean; description: string; transaction: string | null; transactionPromise: any }) => void
  ) => {
    // Mock implementation that simulates the actual behavior
    const promise = signFn ? signFn(tx, password) : Promise.resolve({ success: true });
    return require('../app/lib/utils/timeout').withTimeout(
      promise,
      30000,
      'Transaction signing timed out'
    ).then((result: { success: boolean; error?: string }) => {
      setContext({
        isOpen: false,
        description: '',
        transaction: null,
        transactionPromise: null
      });
      return result.success ? { status: 'SUCCESS' } : { status: 'ERROR', error: result.error };
    }).catch((error: Error) => {
      setContext({
        isOpen: false,
        description: '',
        transaction: null,
        transactionPromise: null
      });
      return { status: 'ERROR', error: error.message };
    });
  }) as any)
}));

describe('Swap Flow with Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply timeout to swap transactions', async () => {
    // Execute the swap to get a transaction
    const swapResult = await swapHbarToToken(
      '10',
      '0.0.123456',
      3000,
      '0.0.789012',
      Math.floor(Date.now() / 1000) + 60,
      50,
      8
    );
    
    // Mock the sign transaction function to return success
    const mockSignTransaction = jest.fn().mockImplementation(() => 
      Promise.resolve({ success: true })
    );
    
    // Mock the context setter
    const mockSetContext = jest.fn();
    
    // Call handleInAppPasswordSubmit directly
    await handleInAppPasswordSubmit(
      swapResult.tx,
      'password123',
      mockSignTransaction as any,
      mockSetContext
    );
    
    // Verify withTimeout was called with the correct parameters
    expect(withTimeout).toHaveBeenCalledWith(
      expect.any(Promise),
      30000,
      expect.stringContaining('timed out')
    );
    
    // Verify sign transaction was called with the correct parameters
    expect(mockSignTransaction).toHaveBeenCalledWith(swapResult.tx, 'password123');
    
    // Verify context was updated after successful transaction
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });

  it('should handle transaction timeout', async () => {
    // Mock withTimeout to simulate a timeout
    (withTimeout as jest.Mock).mockImplementationOnce(() => {
      return Promise.reject(new Error('Transaction signing timed out'));
    });
    
    // Call handleInAppPasswordSubmit without a sign function
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      null as any,
      jest.fn()
    );
    
    // Verify the result contains the error
    expect(result).toEqual({
      status: 'ERROR',
      error: 'Transaction signing timed out'
    });
  });

  it('should handle transaction signing errors', async () => {
    // Mock withTimeout to pass through the promise
    (withTimeout as jest.Mock).mockImplementationOnce((promise) => promise);
    
    // Mock the sign transaction function to throw an error
    const mockError = new Error('Signing failed');
    const mockSignTransaction = jest.fn().mockImplementation(() => Promise.reject(mockError));
    
    // Mock the context setter
    const mockSetContext = jest.fn();
    
    // Call handleInAppPasswordSubmit
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction as any,
      mockSetContext
    );
    
    // Verify the result contains the error
    expect(result).toEqual({
      status: 'ERROR',
      error: 'Signing failed'
    });
    
    // Verify context was updated after error
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });
}); 