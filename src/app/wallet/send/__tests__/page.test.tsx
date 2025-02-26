// Mock IndexedDB for key storage
require('fake-indexeddb/auto');

// Mock the ESM modules and dependencies first
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  transactionToBase64String: jest.fn().mockReturnValue('mock-encoded-tx'),
  base64StringToTransaction: jest.fn().mockReturnValue({
    type: 'TransferTransaction',
    sign: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      transactionId: { toString: () => '0.0.123456@1234567890' },
      getReceipt: jest.fn().mockResolvedValue({ status: { _code: 22 } })
    })
  })
}));

// Mock the storage access
jest.mock('@/lib/utils/keyStorage', () => {
  const mockEncryptedKey = {
    salt: new Uint8Array(16),
    iv: new Uint8Array(12),
    encryptedData: new Uint8Array(112),
  };

  return {
    getStoredKey: jest.fn().mockResolvedValue(mockEncryptedKey),
    decryptStoredKey: jest.fn().mockImplementation((encryptedKey, password) => {
      // Always throw OperationError to simulate decryption failure
      throw new Error('OperationError');
    })
  };
});

jest.mock('@/app/hooks/useAuthSession.setup', () => ({
  TestWrapper: ({ children }: { children: React.ReactNode }) => children,
  TEST_PRIVATE_KEY: {
    publicKey: { toString: () => 'mockPublicKey' },
    toString: () => 'mockPrivateKey'
  }
}));

// Add mock for useSupabase
jest.mock('@/app/hooks/useSupabase', () => ({
  useSupabase: jest.fn().mockReturnValue({
    supabase: {},
    session: null
  })
}));

const mockAddHbarTransfer = jest.fn().mockReturnThis();
const mockAddTokenTransfer = jest.fn().mockReturnThis();
const mockSetTransactionId = jest.fn().mockReturnThis();
const mockFreezeWith = jest.fn().mockReturnThis();

const mockTransferTransaction = jest.fn().mockImplementation(() => ({
  addHbarTransfer: mockAddHbarTransfer,
  addTokenTransfer: mockAddTokenTransfer,
  setTransactionId: mockSetTransactionId,
  freezeWith: mockFreezeWith
}));

// Create mock SDK functions
const mockSDK = {
  addHbarTransfer: jest.fn().mockReturnThis(),
  addTokenTransfer: jest.fn().mockReturnThis(),
  setTransactionId: jest.fn().mockReturnThis(),
  freezeWith: jest.fn().mockReturnThis(),
};

// Mock the hooks and SDK functions
jest.mock('@/app/contexts/InAppWalletContext');

jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: jest.fn(() => ({})),
    forMainnet: jest.fn()
  },
  TransferTransaction: jest.fn().mockImplementation(() => mockSDK),
  AccountId: {
    fromString: jest.fn().mockImplementation((id) => {
      if (id === 'invalid-account') {
        throw new Error('Invalid Hedera account ID format');
      }
      return { toString: () => id };
    }),
  },
  TokenId: {
    fromString: jest.fn().mockImplementation((id) => ({ toString: () => id })),
  },
  PrivateKey: {
    fromString: jest.fn().mockImplementation((key) => ({ toString: () => key })),
  },
  Hbar: jest.fn().mockImplementation((amount) => ({
    toTinybars: () => ({ toString: () => (amount * 100000000).toString() })
  })),
  TransactionId: {
    generate: jest.fn().mockReturnValue({ toString: () => 'mock-tx-id' }),
  },
  AccountBalanceQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      hbars: {
        toTinybars: () => ({ toString: () => '1000000000' })
      },
      tokens: new Map()
    })
  }))
}));

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendPage from '../page';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { TestWrapper } from '@/app/hooks/useAuthSession.setup';
import { TransactionId, TransferTransaction } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { Hbar } from '@hashgraph/sdk';
import { AccountBalanceQuery } from '@hashgraph/sdk';

// Add mock for PasswordModal component
jest.mock('@/app/components/PasswordModal', () => ({
  PasswordModal: ({ context, password, setPassword, onSubmit }: any) => {
    if (!context.isOpen) return null;
    return (
      <div data-testid="password-modal">
        <div>{context.description}</div>
        <input
          type="password"
          placeholder="Enter your wallet password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="password-input"
        />
        <button onClick={onSubmit} data-testid="submit-button">Submit</button>
      </div>
    );
  }
}));

// Add mock for usePasswordModal with proper Promise structure
jest.mock('@/app/hooks/usePasswordModal', () => {
  const { useState } = require('react');

  return {
    usePasswordModal: () => {
      const [password, setPassword] = useState('');
      const [modalContext, setModalContext] = useState({
        isOpen: false,
        transaction: null,
        description: '',
        transactionPromise: null
      });

      const resetPasswordModal = () => {
        setPassword('');
        setModalContext({
          isOpen: false,
          transaction: null,
          description: '',
          transactionPromise: null
        });
      };

      return {
        password,
        setPassword,
        passwordModalContext: modalContext,
        setPasswordModalContext: setModalContext,
        resetPasswordModal
      };
    }
  };
});

jest.mock('@/app/lib/transactions/inAppWallet', () => ({
  handleInAppTransaction: jest.fn().mockImplementation((tx, signTransaction, setContext) => {
    return new Promise((resolve, reject) => {
      setContext({
        isOpen: true,
        transaction: tx,
        description: 'Send 1.5 HBAR to 0.0.654321',
        transactionPromise: { resolve, reject }
      });
    });
  }),
  handleInAppPasswordSubmit: jest.fn().mockImplementation(async (tx, password, signTransaction, setPasswordModal) => {
    if (!password) {
      throw new Error('Password required');
    }
    const result = await signTransaction(tx, password);
    setPasswordModal({
      isOpen: false,
      transaction: null,
      description: '',
      transactionPromise: null
    });
    return { status: 'SUCCESS', transactionId: '0.0.123456@1234567890' };
  })
}));

describe('SendPage', () => {
  const mockSignTransaction = jest.fn().mockImplementation(async (tx, password) => {
    // Simulate decryption error
    throw new Error('OperationError');
  });

  const mockInAppAccount = '0.0.123456';
  
  beforeEach(() => {
    // Mock the wallet context with proper key handling
    (useInAppWallet as jest.Mock).mockReturnValue({
      inAppAccount: mockInAppAccount,
      signTransaction: mockSignTransaction,
      walletType: 'inApp'
    });

    // Mock fetch for token data
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          symbol: 'TEST',
          decimals: 8,
          type: 'FUNGIBLE'
        })
      })
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should load and display initial balances', async () => {
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );
    
    // First check loading state
    expect(screen.getByText('Loading balances...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('HBAR')).toBeInTheDocument();
      expect(screen.getByText('Balance: 10.0000')).toBeInTheDocument();
    });
  });

  it('should handle the complete send flow with password modal', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading balances...')).not.toBeInTheDocument();
    });

    // Fill in send form
    await user.type(screen.getByPlaceholderText('0.0.123456'), '0.0.654321');
    await user.type(screen.getByPlaceholderText('0.00'), '1.5');

    // Click send button
    await user.click(screen.getByText('Send'));

    // Wait for the transaction to be created
    await waitFor(() => {
      expect(mockSDK.addHbarTransfer).toHaveBeenCalledTimes(2);
      expect(mockSDK.setTransactionId).toHaveBeenCalled();
      expect(mockSDK.freezeWith).toHaveBeenCalled();
    });

    // Wait for the password modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      expect(screen.getByText('Send 1.5 HBAR to 0.0.654321')).toBeInTheDocument();
    });

    // Enter password and submit
    const passwordInput = screen.getByPlaceholderText('Enter your wallet password');
    await user.type(passwordInput, 'testpassword');
    await user.click(screen.getByTestId('submit-button'));

    // Wait for the transaction to be signed with the password
    await waitFor(() => {
      expect(mockSignTransaction).toHaveBeenCalledWith('mock-encoded-tx', 'testpassword');
    });

    // Wait for the form to reset
    await waitFor(() => {
      const recipientInput = screen.getByPlaceholderText('0.0.123456') as HTMLInputElement;
      const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(recipientInput.value).toBe('');
      expect(amountInput.value).toBe('');
    }, { timeout: 3000 });
  });

  it('should validate recipient account ID format', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading balances...')).not.toBeInTheDocument();
    });

    // Enter invalid account ID
    await user.type(screen.getByPlaceholderText('0.0.123456'), 'invalid-account');
    await user.type(screen.getByPlaceholderText('0.00'), '1.5');

    // Click send button
    await user.click(screen.getByText('Send'));

    // Wait for the error message to appear
    await waitFor(() => {
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Invalid Hedera account ID format');
    });
  });

  it('should handle token transfers correctly', async () => {
    // Mock a token balance
    const mockTokenBalance = {
      id: '0.0.789012',
      symbol: 'TEST',
      balance: '100',
      decimals: 8
    };

    // Update balance query mock to include token
    ((AccountBalanceQuery as unknown) as jest.Mock).mockImplementation(() => ({
      setAccountId: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        hbars: {
          toTinybars: () => ({ toString: () => '1000000000' })
        },
        tokens: new Map([[mockTokenBalance.id, '10000000000']])
      })
    }));

    // Mock fetch for token data
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          symbol: 'TEST',
          decimals: 8,
          type: 'FUNGIBLE'
        })
      })
    );

    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );

    // Wait for loading to complete and token to appear
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeInTheDocument();
    });

    // Click the token to select it
    await user.click(screen.getByText('TEST'));

    // Perform token transfer
    await user.type(screen.getByPlaceholderText('0.0.123456'), '0.0.654321');
    await user.type(screen.getByPlaceholderText('0.00'), '10');

    // Click send button
    await user.click(screen.getByText('Send'));

    // Wait for the transaction to be created
    await waitFor(() => {
      expect(mockSDK.addTokenTransfer).toHaveBeenCalledTimes(2);
      expect(mockSDK.setTransactionId).toHaveBeenCalled();
      expect(mockSDK.freezeWith).toHaveBeenCalled();
    });
  });

  it('should display password modal when sending transaction', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading balances...')).not.toBeInTheDocument();
    });

    // Fill in send form
    await user.type(screen.getByPlaceholderText('0.0.123456'), '0.0.654321');
    await user.type(screen.getByPlaceholderText('0.00'), '1.5');

    // Click send button
    await user.click(screen.getByText('Send'));

    // Verify the password modal appears with correct content
    await waitFor(() => {
      expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      expect(screen.getByText('Send 1.5 HBAR to 0.0.654321')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your wallet password')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    // Enter password
    await user.type(screen.getByPlaceholderText('Enter your wallet password'), 'testpassword');
    
    // Submit password
    await user.click(screen.getByTestId('submit-button'));

    // Verify the modal closes and transaction completes
    await waitFor(() => {
      expect(screen.queryByTestId('password-modal')).not.toBeInTheDocument();
    });
  });

  it('should display password modal when decryption fails', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <SendPage />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading balances...')).not.toBeInTheDocument();
    });

    // Fill in send form
    await user.type(screen.getByPlaceholderText('0.0.123456'), '0.0.654321');
    await user.type(screen.getByPlaceholderText('0.00'), '1.5');

    // Click send button
    await user.click(screen.getByText('Send'));

    // Verify the password modal appears
    await waitFor(() => {
      expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your wallet password')).toBeInTheDocument();
    });

    // Enter password
    await user.type(screen.getByPlaceholderText('Enter your wallet password'), 'wrongpassword');
    
    // Submit password
    await user.click(screen.getByTestId('submit-button'));

    // Verify error is shown and modal stays open
    await waitFor(() => {
      // Modal should still be open
      expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      // Error message should be shown
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid password. Please try again.');
      // Password input should still be there
      expect(screen.getByPlaceholderText('Enter your wallet password')).toBeInTheDocument();
    });

    // Try another wrong password
    await user.clear(screen.getByPlaceholderText('Enter your wallet password'));
    await user.type(screen.getByPlaceholderText('Enter your wallet password'), 'anotherwrongpassword');
    await user.click(screen.getByTestId('submit-button'));

    // Verify modal is still open and error is still shown
    await waitFor(() => {
      expect(screen.getByTestId('password-modal')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid password. Please try again.');
    });
  });
}); 