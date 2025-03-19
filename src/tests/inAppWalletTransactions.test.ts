import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// First, mock the timeout module
const mockPromiseRace = jest.spyOn(Promise, 'race') as jest.MockedFunction<typeof Promise.race>;

// Mock base64StringToTransaction to throw an error like in original test
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  base64StringToTransaction: jest.fn().mockImplementation(() => {
    throw new Error('Mock decode error');
  })
}));

// Import the function after mocking dependencies
import { handleInAppPasswordSubmit } from '../app/lib/transactions/inAppWallet';

// Type definition for sign transaction function
type SignTransactionFn = (tx: string, password: string) => Promise<any>;

// Define response types for better type safety
interface SuccessResponse {
  success: boolean;
  data: { status: string };
}

describe('In-App Wallet Transaction Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the Promise.race mock - default behavior is to pass through
    mockPromiseRace.mockImplementation((promises: readonly unknown[]) => promises[0] as Promise<unknown>);
  });

  it('should handle successful transaction signing', async () => {
    // Create mock for successful transaction signing with proper type cast
    const mockSignTransaction = jest.fn() as jest.MockedFunction<SignTransactionFn>;
    mockSignTransaction.mockResolvedValue({
      success: true,
      data: { status: 'SUCCESS' }
    });
    
    const mockSetContext = jest.fn();
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction,
      mockSetContext
    );
    
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    expect(result).toEqual({ status: 'SUCCESS' });
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });

  it('should handle transaction signing errors', async () => {
    // Create mock for transaction signing error with proper type cast
    const mockSignTransaction = jest.fn() as jest.MockedFunction<SignTransactionFn>;
    mockSignTransaction.mockRejectedValue(new Error('Signing failed'));
    
    const mockSetContext = jest.fn();
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction,
      mockSetContext
    );
    
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    expect(result).toEqual({ status: 'ERROR', error: 'Signing failed' });
    expect(mockSetContext).toHaveBeenCalledWith({
      isOpen: false,
      description: '',
      transaction: null,
      transactionPromise: null
    });
  });

  it('should handle transaction timeout', async () => {
    // Create mock for successful transaction with proper type cast
    const mockSignTransaction = jest.fn() as jest.MockedFunction<SignTransactionFn>;
    mockSignTransaction.mockResolvedValue({
      success: true,
      data: { status: 'SUCCESS' }
    });
    
    const mockSetContext = jest.fn();
    
    // Set up the timeout error message
    const timeoutMessage = 'Transaction signing timed out. The network might be congested or there could be a connection issue.';
    
    // Mock Promise.race to simulate a timeout by rejecting with the timeout error
    // This directly simulates what happens when the timeout Promise wins the race
    mockPromiseRace.mockImplementationOnce(() => Promise.reject(new Error(timeoutMessage)));
    
    const result = await handleInAppPasswordSubmit(
      'mock-transaction',
      'password123',
      mockSignTransaction,
      mockSetContext
    );
    
    // The sign function is still called before the timeout occurs
    expect(mockSignTransaction).toHaveBeenCalledWith('mock-transaction', 'password123');
    
    // Verify Promise.race was called (which means withTimeout was used)
    expect(mockPromiseRace).toHaveBeenCalled();
    
    // Verify the result reflects a timeout error
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