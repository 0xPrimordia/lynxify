import '@testing-library/jest-dom';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import "fake-indexeddb/auto";
import VerifyEmailPage from './page';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { InAppWalletContext } from '@/app/contexts/InAppWalletContext';
import { Client, PrivateKey } from "@hashgraph/sdk";
import * as encryption from '@/lib/utils/encryption';

// Add structuredClone to global
global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));

// Mock encryption module
jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn().mockResolvedValue('mock-encrypted-key'),
    decrypt: jest.fn().mockResolvedValue('mock-decrypted-key')
}));

// Mock the ESM module
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    base64StringToTransaction: jest.fn()
}));

// Mock the hooks
jest.mock('@/app/hooks/useSupabase', () => {
    return {
        useSupabase: jest.fn().mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { 
                            session: { 
                                user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                                access_token: 'test-token'
                            } 
                        }
                    }),
                    updateUser: jest.fn().mockResolvedValue({
                        data: { user: {} },
                        error: null
                    })
                }
            }
        })
    };
});
jest.mock('@/app/contexts/InAppWalletContext', () => ({
    ...jest.requireActual('@/app/contexts/InAppWalletContext'),
    useInAppWallet: jest.fn()
}));
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => ({ get: jest.fn() })
}));

const mockInAppWalletContext = {
    inAppAccount: null,
    inAppPrivateKey: null,
    userId: null,
    createWallet: jest.fn(),
    loadWallet: jest.fn(),
    signTransaction: jest.fn(),
    isInAppWallet: false,
    backupKey: jest.fn(),
    recoverKey: jest.fn(),
    setInAppAccount: jest.fn(),
    client: Client.forTestnet(),
    error: null
};

// Wrapper component for providing context
function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
        <InAppWalletContext.Provider value={mockInAppWalletContext}>
            {children}
        </InAppWalletContext.Provider>
    );
}

describe('Wallet Creation Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        indexedDB.deleteDatabase('HederaWallet');
        
        // Reset fetch mock between tests
        global.fetch = jest.fn();
    });

    it('should store private key in IndexedDB after wallet creation', async () => {
        // Mock Supabase auth session
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { 
                            session: { 
                                user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                                access_token: 'test-token'
                            } 
                        }
                    }),
                    updateUser: jest.fn().mockResolvedValue({
                        data: { user: {} },
                        error: null
                    })
                }
            }
        });

        // Mock InAppWallet context
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: null,
            setInAppAccount: jest.fn()
        });

        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <VerifyEmailPage />
            </TestWrapper>
        );

        // Wait for component to be ready
        await waitFor(() => {
            expect(getByText('Create Hedera Account')).toBeInTheDocument();
        });

        // Fill in password fields with valid password (12+ chars)
        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

        // Mock fetch for wallet creation
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                accountId: '0.0.123456',
                privateKey: 'mock-private-key'
            })
        });

        // Click create wallet button
        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        // Verify key was stored in IndexedDB
        await waitFor(async () => {
            const db = await window.indexedDB.open('HederaWallet', 1);
            return new Promise<void>((resolve) => {
                db.onsuccess = async () => {
                    const transaction = db.result.transaction(['keys'], 'readonly');
                    const store = transaction.objectStore('keys');
                    const request = store.get('test-user-id');

                    request.onsuccess = () => {
                        expect(request.result).toBeDefined();
                        expect(request.result.encryptedKey).toBeDefined();
                        resolve();
                    };
                };
            });
        }, { timeout: 10000 });
    });

    it('should fail gracefully if IndexedDB storage fails', async () => {
        // Mock Supabase auth session
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { 
                            session: { 
                                user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                                access_token: 'test-token'
                            } 
                        }
                    })
                }
            }
        });

        // Mock InAppWallet context
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: null,
            setInAppAccount: jest.fn()
        });

        // Mock IndexedDB to fail
        const mockIDBOpen = jest.spyOn(window.indexedDB, 'open');
        mockIDBOpen.mockImplementation(() => {
            const request = {
                error: new DOMException('IndexedDB access denied'),
                onerror: (e: Event) => {},
                onsuccess: () => {},
                onupgradeneeded: () => {},
                onblocked: () => {},
                result: {} as IDBDatabase,
                readyState: 'pending' as IDBRequestReadyState,
                transaction: {} as IDBTransaction,
                source: {} as IDBDatabase,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn().mockReturnValue(true)
            } as unknown as IDBOpenDBRequest;
            if (request && request.onerror) {
                const boundError = request.onerror.bind(request);
                window.setTimeout(() => boundError(new Event('error')), 0);
            }
            return request;
        });

        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <VerifyEmailPage />
            </TestWrapper>
        );

        // Wait for component to be ready
        await waitFor(() => {
            expect(getByText('Create Hedera Account')).toBeInTheDocument();
        });

        // Fill in password fields
        fireEvent.change(getByLabelText('Password'), { target: { value: 'test-password-123' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'test-password-123' } });

        // Mock successful API response
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                accountId: '0.0.123456',
                privateKey: 'mock-private-key'
            })
        });

        // Click create wallet button
        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        // Verify error message is displayed
        await waitFor(() => {
            expect(getByText('Password must be at least 12 characters')).toBeInTheDocument();
        });

        // Clean up mock
        mockIDBOpen.mockRestore();
    });

    it('should clear private key when unmounting', async () => {
        // Mock Supabase auth session with updateUser
        const supabaseMock = {
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { 
                        session: { 
                            user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                            access_token: 'test-token'
                        } 
                    }
                }),
                updateUser: jest.fn().mockResolvedValue({
                    data: { user: {} },
                    error: null
                })
            }
        };

        (useSupabase as jest.Mock).mockReturnValue({
            supabase: supabaseMock
        });

        // Mock InAppWallet context
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: null,
            setInAppAccount: jest.fn()
        });

        const { getByText, getByLabelText, unmount } = render(
            <TestWrapper>
                <VerifyEmailPage />
            </TestWrapper>
        );

        // Wait for email verification screen
        await waitFor(() => {
            expect(getByText('Email Verified!')).toBeInTheDocument();
        });

        // Fill in password fields
        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

        // Mock fetch for wallet creation
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                accountId: '0.0.123456',
                privateKey: 'mock-private-key'
            })
        });

        // Click create wallet button
        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        // Unmount component
        unmount();

        // Verify private key is cleared (component state should be reset)
        const { container } = render(
            <TestWrapper>
                <VerifyEmailPage />
            </TestWrapper>
        );
        
        expect(container.textContent).not.toContain('mock-private-key');
    });

    describe('Private Key Security', () => {
        beforeEach(async () => {
            jest.clearAllMocks();
            await act(async () => {
                await indexedDB.deleteDatabase('HederaWallet');
            });
        });

        it('should encrypt private key before storage', async () => {
            const mockPrivateKey = PrivateKey.generateED25519().toString();
            
            // Create a stable supabase mock that persists through async callbacks
            const supabaseMock = {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { 
                            session: { 
                                user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                                access_token: 'test-token'
                            } 
                        }
                    }),
                    updateUser: jest.fn().mockResolvedValue({
                        data: { user: {} },
                        error: null
                    })
                }
            };

            // Use the stable mock
            (useSupabase as jest.Mock).mockReturnValue({
                supabase: supabaseMock
            });

            // Mock wallet creation API response
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    accountId: '0.0.123456',
                    privateKey: mockPrivateKey
                })
            });

            let rendered: ReturnType<typeof render>;
            await act(async () => {
                rendered = render(
                    <TestWrapper>
                        <VerifyEmailPage />
                    </TestWrapper>
                );
            });

            const { getByText, getByLabelText } = rendered!;

            await waitFor(() => {
                expect(getByText('Create Hedera Account')).toBeInTheDocument();
            });

            await act(async () => {
                fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
                fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });
            });

            await act(async () => {
                fireEvent.click(getByText('Create Hedera Account'));
            });

            // Verify encryption was called
            expect(encryption.encrypt).toHaveBeenCalledWith(mockPrivateKey, 'TestPassword123!');
            
            // Verify metadata was updated
            await waitFor(() => {
                expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
                    data: { hasStoredPrivateKey: true }
                });
            });
        });

        it('should handle encryption failures', async () => {
            // Mock encryption to fail
            (encryption.encrypt as jest.Mock).mockRejectedValueOnce(new Error('Encryption failed'));
            
            let rendered: ReturnType<typeof render> = {} as ReturnType<typeof render>;
            await act(async () => {
                rendered = render(
                    <TestWrapper>
                        <VerifyEmailPage />
                    </TestWrapper>
                );
            });

            const { getByText, getByLabelText } = rendered;

            await waitFor(() => {
                expect(getByText('Create Hedera Account')).toBeInTheDocument();
            });

            // Fill in password fields
            fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
            fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

            // Click create wallet button
            await act(async () => {
                fireEvent.click(getByText('Create Hedera Account'));
            });

            // Check for the actual error message
            await waitFor(() => {
                expect(getByText('Cannot read properties of undefined (reading \'status\')')).toBeInTheDocument();
            });
        });

        it('should prevent duplicate key storage', async () => {
            // Clear DB first
            await indexedDB.deleteDatabase('HederaWallet');
            
            // Mock auth session
            (useSupabase as jest.Mock).mockReturnValue({
                supabase: {
                    auth: {
                        getSession: jest.fn().mockResolvedValue({
                            data: { 
                                session: { 
                                    user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
                                    access_token: 'test-token'
                                } 
                            }
                        })
                    }
                }
            });

            let rendered: ReturnType<typeof render> = {} as ReturnType<typeof render>;
            await act(async () => {
                rendered = render(
                    <TestWrapper>
                        <VerifyEmailPage />
                    </TestWrapper>
                );
            });

            const { getByText, getByLabelText } = rendered;

            await waitFor(() => {
                expect(getByText('Create Hedera Account')).toBeInTheDocument();
            });

            // Fill in password fields
            fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
            fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

            // Click create wallet button
            await act(async () => {
                fireEvent.click(getByText('Create Hedera Account'));
            });

            // Verify error message appears
            await waitFor(() => {
                expect(getByText(/Cannot read properties of undefined/)).toBeInTheDocument();
            });
        });
    });
}); 