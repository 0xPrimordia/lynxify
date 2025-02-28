import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleInAppPasswordSubmit } from '../app/lib/transactions/inAppWallet';
import { withTimeout } from '../app/lib/utils/timeout';

// Mock the HashPack/wallet interactions
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  base64StringToTransaction: jest.fn().mockImplementation(() => {
    throw new Error('Mocked error');
  })
}));

// Mock the timeout utility
jest.mock('../app/lib/utils/timeout', () => ({
  withTimeout: jest.fn((promise) => promise)
}));

describe('In-App Wallet Transaction Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful transaction signing', async () => {
    const mockSignTransaction = jest.fn().mockImplementation(() => 
      Promise.resolve({ success: true, data: { status: 'SUCCESS' } })
    );
    const mockSetContext = jest.fn() as any;
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction as (tx: string, password: string) => Promise<any>,
      mockSetContext
    );
    
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    expect(result).toEqual({ status: 'SUCCESS' });
    // The context is set to close the modal after success
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });

  it('should handle transaction signing errors', async () => {
    const mockError = new Error('Signing failed');
    const mockSignTransaction = jest.fn().mockImplementation(() => Promise.reject(mockError));
    const mockSetContext = jest.fn();
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction as (tx: string, password: string) => Promise<any>,
      mockSetContext
    );
    
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    expect(result).toEqual({ status: 'ERROR', error: 'Signing failed' });
    // The context is set to close the modal after error
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });

  it('should handle transaction timeout', async () => {
    // Mock a transaction that times out
    const mockSignTransaction = jest.fn().mockImplementation(() => 
      Promise.resolve({ success: true, data: { status: 'SUCCESS' } })
    );
    const mockSetContext = jest.fn();
    
    // Mock withTimeout to simulate a timeout
    const timeoutMessage = 'Transaction signing timed out. The network might be congested or there could be a connection issue.';
    (withTimeout as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error(timeoutMessage)));
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction as (tx: string, password: string) => Promise<any>,
      mockSetContext
    );
    
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    expect(result).toEqual({ status: 'ERROR', error: timeoutMessage });
    // The context is set to close the modal after timeout
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });
}); 