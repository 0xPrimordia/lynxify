import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { InAppWalletProvider, useInAppWallet } from './InAppWalletContext';
import { supabase } from '@/utils/supabase';
import { PrivateKey } from "@hashgraph/sdk";
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import 'fake-indexeddb/auto';

// Add structuredClone to global
global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));

// Mock console.error
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});
afterAll(() => {
    console.error = originalError;
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
    base64StringToTransaction: jest.fn().mockReturnValue({
        sign: jest.fn().mockResolvedValue({
            execute: jest.fn().mockResolvedValue({
                getReceipt: jest.fn().mockResolvedValue({})
            })
        })
    })
}));

jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn()
}));

// Simple test component to display wallet state and actions
const TestComponent = () => {
    const { inAppAccount, isInAppWallet, loadWallet, signTransaction } = useInAppWallet();
    
    const handleLoadWallet = async () => {
        try {
            await loadWallet('test-password');
        } catch (error) {
            console.error('Load wallet error:', error);
        }
    };

    const handleSignTransaction = async () => {
        try {
            await signTransaction('test-transaction', 'test-password');
        } catch (error) {
            console.error('Sign transaction error:', error);
        }
    };

    return (
        <div>
            <div data-testid="account-id">{inAppAccount || 'No Account'}</div>
            <div data-testid="is-inapp-wallet">{isInAppWallet.toString()}</div>
            <button onClick={handleLoadWallet} data-testid="load-wallet">Load Wallet</button>
            <button onClick={handleSignTransaction} data-testid="sign-tx">Sign Transaction</button>
        </div>
    );
};

describe('InAppWalletContext', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        indexedDB.deleteDatabase('HederaWallet');

        // Setup default Supabase responses
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
            }
        });

        // Mock Users table response
        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { 
                    isInAppWallet: true,
                    hederaAccountId: '0.0.123456'
                },
                error: null
            })
        });

        // Initialize IndexedDB with a test key
        const db = await new Promise<IDBDatabase>((resolve) => {
            const request = indexedDB.open('HederaWallet', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore('keys', { keyPath: 'userId' });
            };
            request.onsuccess = () => resolve(request.result);
        });

        await act(async () => {
            const transaction = db.transaction(['keys'], 'readwrite');
            const store = transaction.objectStore('keys');
            await store.add({
                userId: 'test-user-id',
                encryptedKey: 'encrypted-test-key'
            });
        });
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
        }, { timeout: 2000 });
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
        it('should clear private key from memory after timeout', async () => {
            jest.useFakeTimers();
            const mockPrivateKey = PrivateKey.generateED25519();
            (decrypt as jest.Mock).mockResolvedValue(mockPrivateKey.toString());

            // Initialize IndexedDB with test data
            const db = await new Promise<IDBDatabase>((resolve) => {
                const request = indexedDB.open('HederaWallet', 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    db.createObjectStore('keys', { keyPath: 'userId' });
                };
                request.onsuccess = () => resolve(request.result);
            });

            await act(async () => {
                const transaction = db.transaction(['keys'], 'readwrite');
                const store = transaction.objectStore('keys');
                await store.add({
                    userId: 'test-user-id',
                    encryptedKey: 'encrypted-test-key'
                });
            });

            let rendered;
            await act(async () => {
                rendered = render(
                    <InAppWalletProvider>
                        <TestComponent />
                    </InAppWalletProvider>
                );
            });

            // Wait for initial render and state setup
            await waitFor(() => {
                expect(rendered!.getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            });

            const { getByTestId } = rendered!;

            // First load
            await act(async () => {
                fireEvent.click(getByTestId('load-wallet'));
            });
            await waitFor(() => expect(decrypt).toHaveBeenCalledTimes(1));

            // Advance time
            act(() => {
                jest.advanceTimersByTime(10 * 60 * 1000);
            });

            // Second load
            await act(async () => {
                fireEvent.click(getByTestId('load-wallet'));
            });
            await waitFor(() => expect(decrypt).toHaveBeenCalledTimes(2));

            jest.useRealTimers();
        });

        it('should handle concurrent loadWallet calls safely', async () => {
            const mockPrivateKey = PrivateKey.generateED25519();
            let isDecrypting = false;
            
            // Mock decrypt to block while a decrypt is in progress
            (decrypt as jest.Mock).mockImplementation(() => {
                if (isDecrypting) {
                    return new Promise(() => {}); // Never resolve if already decrypting
                }
                isDecrypting = true;
                return Promise.resolve(mockPrivateKey.toString());
            });

            const { getByTestId } = render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await waitFor(() => {
                expect(getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            });

            // Trigger multiple loads
            const loadPromise1 = act(() => fireEvent.click(getByTestId('load-wallet')));
            const loadPromise2 = act(() => fireEvent.click(getByTestId('load-wallet')));
            const loadPromise3 = act(() => fireEvent.click(getByTestId('load-wallet')));

            // Wait for all promises
            await Promise.all([loadPromise1, loadPromise2, loadPromise3]);
            
            // Wait for any state updates
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(decrypt).toHaveBeenCalledTimes(1);
        });
    });

    describe('signTransaction', () => {
        it('should not persist private key after signing', async () => {
            const mockPrivateKey = PrivateKey.generateED25519();
            let decryptCalls = 0;
            
            (decrypt as jest.Mock).mockImplementation(() => {
                decryptCalls++;
                return Promise.resolve(mockPrivateKey.toString());
            });

            const { getByTestId } = render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await waitFor(() => {
                expect(getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            });

            // First sign
            await act(async () => {
                fireEvent.click(getByTestId('sign-tx'));
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Reset counter
            decryptCalls = 0;

            // Second sign
            await act(async () => {
                fireEvent.click(getByTestId('sign-tx'));
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(decryptCalls).toBe(1);
        });

        it('should handle transaction failures without exposing key', async () => {
            const mockPrivateKey = PrivateKey.generateED25519();
            const mockError = new Error('Transaction failed');
            
            (decrypt as jest.Mock).mockResolvedValue(mockPrivateKey.toString());
            (base64StringToTransaction as jest.Mock).mockReturnValue({
                sign: jest.fn().mockRejectedValue(mockError)
            });

            // Mock console.error for this test only
            const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

            const { getByTestId } = render(
                <InAppWalletProvider>
                    <TestComponent />
                </InAppWalletProvider>
            );

            await waitFor(() => {
                expect(getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            });

            // Attempt to sign
            await act(async () => {
                fireEvent.click(getByTestId('sign-tx'));
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(consoleErrorMock).toHaveBeenCalledWith(
                'Transaction signing error:',
                expect.any(Error)
            );

            // Cleanup
            consoleErrorMock.mockRestore();
        });
    });
}); 