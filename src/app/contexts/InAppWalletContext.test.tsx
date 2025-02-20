import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { InAppWalletProvider, useInAppWallet, InAppWalletContextType } from './InAppWalletContext';
import { supabase } from '@/utils/supabase';
import { PrivateKey } from "@hashgraph/sdk";
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { storePrivateKey, retrievePrivateKey, attemptRecovery } from '@/lib/utils/keyStorage';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import 'fake-indexeddb/auto';

// Add structuredClone to global
global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));

// Mock console.error
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
beforeAll(() => {
    mockConsoleError.mockClear();
});
afterAll(() => {
    mockConsoleError.mockRestore();
});

// Mock modules
jest.mock('@/utils/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn()
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                        data: { isInAppWallet: true },
                        error: null
                    })
                }))
            }))
        }))
    }
}));

jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    base64StringToTransaction: jest.fn()
}));

jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn()
}));

jest.mock('@/lib/utils/keyStorage', () => ({
    storePrivateKey: jest.fn(),
    retrievePrivateKey: jest.fn(),
    attemptRecovery: jest.fn().mockResolvedValue(true),
    STORAGE_CONFIG: {
        PRIMARY_DB: 'test_primary',
        BACKUP_DB: 'test_backup',
        STORE_NAME: 'keys',
        VERSION: 1
    }
}));

// Simple test component to display wallet state and actions
const TestComponent = () => {
    const { 
        inAppAccount, 
        isInAppWallet, 
        loadWallet, 
        signTransaction,
        recoverKey,
        verifyMetadataSync,
        isRecoveryInProgress,
        error
    } = useInAppWallet();
    
    return (
        <div>
            <div data-testid="account-id">{inAppAccount || 'No Account'}</div>
            <div data-testid="is-inapp-wallet">{isInAppWallet.toString()}</div>
            <div data-testid="recovery-status">
                {isRecoveryInProgress ? 'Recovery in progress' : 'No recovery in progress'}
            </div>
            {error && <div data-testid="error-message">{error}</div>}
            <button onClick={() => loadWallet('test-password')} data-testid="load-wallet">Load Wallet</button>
            <button onClick={() => signTransaction('test-transaction', 'test-password')} data-testid="sign-tx">Sign Transaction</button>
            <button onClick={() => recoverKey('test-user-id')} data-testid="recover-key">Recover Key</button>
            {/* Expose functions for test access */}
            <div data-testid="test-helpers" style={{ display: 'none' }}>
                {JSON.stringify({ recoverKey, verifyMetadataSync })}
            </div>
        </div>
    );
};

// Instead of directly using hooks
const TestWrapper = ({ children }: { children: (wallet: InAppWalletContextType) => React.ReactNode }) => {
    const wallet = useInAppWallet();
    return <div data-testid="test-wrapper">{children(wallet)}</div>;
};

describe('InAppWalletContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({
            data: {
                session: {
                    user: {
                        id: 'test-user-id',
                        user_metadata: {
                            isInAppWallet: true,
                            hederaAccountId: '0.0.123456'
                        }
                    }
                }
            },
            error: null
        });
    });

    afterEach(() => {
        // Restore console.error
        mockConsoleError.mockRestore();
    });

    it('should detect existing in-app wallet from session', async () => {
        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            expect(screen.getByTestId('account-id')).toHaveTextContent('0.0.123456');
        });
    });

    it('should handle session without in-app wallet', async () => {
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({
            data: {
                session: {
                    user: {
                        user_metadata: {}
                    }
                }
            }
        });

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-inapp-wallet')).toHaveTextContent('false');
            expect(screen.getByTestId('account-id')).toHaveTextContent('No Account');
        });
    });

    describe('loadWallet', () => {
        it('should successfully load wallet with correct password', async () => {
            const mockPrivateKey = PrivateKey.generateED25519();
            (retrievePrivateKey as jest.Mock).mockResolvedValue(mockPrivateKey.toString());

            const { getByTestId } = render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(getByTestId('load-wallet'));
            });

            expect(retrievePrivateKey).toHaveBeenCalledWith('test-user-id', 'test-password');
        });

        it('should handle key retrieval failure', async () => {
            const error = new Error('Failed to retrieve private key');
            (retrievePrivateKey as jest.Mock).mockRejectedValue(error);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to retrieve private key');
            });
        });

        it('should prevent multiple wallet creation attempts', async () => {
            // Mock retrievePrivateKey to be slow but eventually succeed
            const mockRetrievePrivateKey = jest.fn(() => 
                new Promise(resolve => setTimeout(() => resolve('mock-private-key'), 100))
            );
            (retrievePrivateKey as jest.Mock).mockImplementation(mockRetrievePrivateKey);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            // First click should start the operation
            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            // Second click should be rejected immediately
            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            // Wait for the error message
            await waitFor(() => {
                const errorElement = screen.getByTestId('error-message');
                expect(errorElement).toHaveTextContent('Operation in progress');
            });

            // Wait for the first operation to complete
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 150));
            });
        });
    });

    describe('signTransaction', () => {
        it('should sign transaction with loaded wallet', async () => {
            const mockPrivateKey = PrivateKey.generateED25519();
            (retrievePrivateKey as jest.Mock).mockResolvedValue(mockPrivateKey.toString());
            (base64StringToTransaction as jest.Mock).mockReturnValue({
                sign: jest.fn().mockResolvedValue({
                    execute: jest.fn().mockResolvedValue({
                        getReceipt: jest.fn().mockResolvedValue({})
                    })
                })
            });

            const { getByTestId } = render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(getByTestId('sign-tx'));
            });

            expect(retrievePrivateKey).toHaveBeenCalledWith('test-user-id', 'test-password');
            expect(base64StringToTransaction).toHaveBeenCalled();
        });
    });

    describe('Recovery Process', () => {
        it('should prevent concurrent recovery attempts', async () => {
            // Mock attemptRecovery to be slow
            const mockAttemptRecovery = jest.fn(() => 
                new Promise(resolve => setTimeout(() => resolve(true), 100))
            );
            (attemptRecovery as jest.Mock).mockImplementation(mockAttemptRecovery);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            // Start first recovery
            await act(async () => {
                fireEvent.click(screen.getByTestId('recover-key'));
            });

            // Attempt second recovery while first is in progress
            await act(async () => {
                fireEvent.click(screen.getByTestId('recover-key'));
            });

            // Verify error message appears
            await waitFor(() => {
                const errorElement = screen.getByTestId('error-message');
                expect(errorElement).toHaveTextContent('Recovery already in progress');
            });

            // Wait for the first recovery to complete
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 150));
            });
        });

        it('should update recovery state during process', async () => {
            (attemptRecovery as jest.Mock).mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 100))
            );

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(screen.getByTestId('recover-key'));
                await new Promise(resolve => setTimeout(resolve, 50));
            });

            expect(screen.getByTestId('recovery-status')).toHaveTextContent('Recovery in progress');
        });
    });

    describe('Critical Security Cases', () => {
        it('should handle storage version mismatches', async () => {
            const error = new Error('Version mismatch');
            (retrievePrivateKey as jest.Mock).mockRejectedValue(error);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('error-message')).toHaveTextContent('Version mismatch');
            });
        });

        it('should handle metadata synchronization', async () => {
            const error = new Error('Account metadata mismatch');
            let walletInstance: InAppWalletContextType | undefined;
            
            render(
                <InAppWalletProvider>
                    <TestWrapper>
                        {(wallet) => {
                            walletInstance = wallet;
                            return <div data-testid="wrapper" />;
                        }}
                    </TestWrapper>
                </InAppWalletProvider>
            );

            if (!walletInstance) {
                throw new Error('Wallet instance not available');
            }

            // Type assertion to help TypeScript understand walletInstance is defined
            const wallet = walletInstance as InAppWalletContextType;

            await expect(async () => {
                await wallet.verifyMetadataSync(
                    { hederaAccountId: '0.0.123456' },
                    { hederaAccountId: '0.0.789012' }
                );
            }).rejects.toThrow('Account metadata mismatch');

            expect(mockConsoleError).toHaveBeenCalledWith(error.message, error);
        });
    });

    describe('Recovery and Backup Scenarios', () => {
        it('should handle complete storage failure with recovery options', async () => {
            const error = new Error('Storage unavailable');
            (retrievePrivateKey as jest.Mock).mockRejectedValue(error);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('error-message')).toHaveTextContent('Storage unavailable');
            });
        });

        it('should prevent operations during recovery process', async () => {
            // Mock retrievePrivateKey to be slow
            const mockRetrievePrivateKey = jest.fn(() => 
                new Promise(resolve => setTimeout(() => resolve('mock-private-key'), 1000))
            );
            (retrievePrivateKey as jest.Mock).mockImplementation(mockRetrievePrivateKey);

            render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            // Start a wallet operation
            await act(async () => {
                fireEvent.click(screen.getByTestId('load-wallet'));
            });

            // Try to perform another operation while the first is in progress
            await act(async () => {
                fireEvent.click(screen.getByTestId('sign-tx'));
            });

            // Verify error message appears
            await waitFor(() => {
                const errorElement = screen.getByTestId('error-message');
                expect(errorElement).toHaveTextContent('Operation in progress');
            });

            // Wait for the operation to complete
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 1100));
            });
        });
    });

    describe('Metadata Synchronization', () => {
        it('should detect metadata mismatches', async () => {
            let walletInstance: InAppWalletContextType | undefined;
            
            render(
                <InAppWalletProvider>
                    <TestWrapper>
                        {(wallet) => {
                            walletInstance = wallet;
                            return <div data-testid="wrapper" />;
                        }}
                    </TestWrapper>
                </InAppWalletProvider>
            );

            if (!walletInstance) {
                throw new Error('Wallet instance not available');
            }

            const result = await walletInstance.verifyMetadataSync(
                { hederaAccountId: '0.0.123456' },
                { hederaAccountId: '0.0.789012' }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Account metadata mismatch');
            expect(mockConsoleError).toHaveBeenCalledWith(
                'Account metadata mismatch',
                expect.any(Error)
            );
        });
    });
}); 