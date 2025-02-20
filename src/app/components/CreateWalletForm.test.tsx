import '@testing-library/jest-dom';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import "fake-indexeddb/auto";
import CreateWalletForm from './CreateWalletForm';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { InAppWalletContext } from '@/app/contexts/InAppWalletContext';
import { Client, PrivateKey } from "@hashgraph/sdk";
import * as encryption from '@/lib/utils/encryption';
import { STORAGE_CONFIG } from '@/lib/utils/keyStorage';

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
jest.mock('@/app/hooks/useSupabase', () => ({
    useSupabase: jest.fn()
}));

jest.mock('@/app/contexts/InAppWalletContext', () => ({
    ...jest.requireActual('@/app/contexts/InAppWalletContext'),
    useInAppWallet: jest.fn()
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
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

function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
        <InAppWalletContext.Provider value={mockInAppWalletContext}>
            {children}
        </InAppWalletContext.Provider>
    );
}

describe('CreateWalletForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        indexedDB.deleteDatabase(STORAGE_CONFIG.PRIMARY_DB);
        indexedDB.deleteDatabase(STORAGE_CONFIG.BACKUP_DB);
        global.fetch = jest.fn();

        // Reset mocks with default successful responses
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

        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: null,
            setInAppAccount: jest.fn()
        });
    });

    it('should store private key in IndexedDB after wallet creation', async () => {
        // First, initialize the database
        await new Promise<void>((resolve) => {
            const request = indexedDB.open(STORAGE_CONFIG.PRIMARY_DB, STORAGE_CONFIG.VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
                    db.createObjectStore(STORAGE_CONFIG.STORE_NAME, { keyPath: 'userId' });
                }
            };
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };
        });

        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        // Fill in password fields
        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

        // Mock successful wallet creation
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                accountId: '0.0.123456',
                privateKey: 'mock-private-key'
            })
        });

        // Submit form
        await act(async () => {
            fireEvent.submit(getByText('Create Hedera Account').closest('form')!);
        });

        // Wait for IndexedDB operation to complete
        await waitFor(async () => {
            const result = await new Promise((resolve) => {
                const request = indexedDB.open(STORAGE_CONFIG.PRIMARY_DB, STORAGE_CONFIG.VERSION);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readonly');
                    const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
                    const getRequest = store.get('test-user-id');

                    getRequest.onsuccess = () => {
                        resolve(getRequest.result);
                    };
                };
            });

            expect(result).toBeDefined();
            expect(result).toHaveProperty('encryptedKey', 'mock-encrypted-key');
        }, { timeout: 10000 });
    });

    it('should show error for non-matching passwords', async () => {
        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'DifferentPassword123!' } });

        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        expect(getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should show error for short passwords', async () => {
        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        fireEvent.change(getByLabelText('Password'), { target: { value: 'short' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'short' } });

        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        expect(getByText('Password must be at least 12 characters')).toBeInTheDocument();
    });

    it('should show error when wallet creation fails', async () => {
        const { getByText, getByLabelText } = render(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

        // Mock failed wallet creation
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Failed to create wallet' })
        });

        await act(async () => {
            fireEvent.click(getByText('Create Hedera Account'));
        });

        expect(getByText('Failed to create wallet')).toBeInTheDocument();
    });

    it('should show success state after wallet creation', async () => {
        // Mock InAppWallet context with account set
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: '0.0.123456',
            setInAppAccount: jest.fn()
        });

        const { getByText, getByLabelText, rerender } = render(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        // Fill in password fields
        fireEvent.change(getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
        fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });

        // Mock successful wallet creation
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                accountId: '0.0.123456',
                privateKey: 'mock-private-key'
            })
        });

        // Submit form
        await act(async () => {
            fireEvent.submit(getByText('Create Hedera Account').closest('form')!);
        });

        // Rerender with updated context
        rerender(
            <TestWrapper>
                <CreateWalletForm />
            </TestWrapper>
        );

        // Check for success state
        await waitFor(() => {
            expect(getByText(/Wallet Created!/i)).toBeInTheDocument();
            expect(getByText('0.0.123456')).toBeInTheDocument();
        });
    });
}); 