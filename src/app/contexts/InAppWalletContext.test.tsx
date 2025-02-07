import '@testing-library/jest-dom';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { InAppWalletProvider, useInAppWallet } from './InAppWalletContext';
import { Client, AccountId, PrivateKey, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";
import { fetch, Response, Request } from 'cross-fetch';  // Add this import

// Add JSDOM Response to global scope
global.Response = Response;
global.Request = Request;  // Add this line

declare global {
    namespace NodeJS {
        interface Global {
            fetch: jest.Mock<Promise<Response>, any[]>;
        }
    }
}

// Mock IndexedDB
const indexedDB = {
    open: jest.fn(() => ({
        result: {
            createObjectStore: jest.fn(),
            transaction: jest.fn(() => ({
                objectStore: jest.fn(() => ({
                    put: jest.fn(),
                    get: jest.fn()
                }))
            }))
        },
        onupgradeneeded: jest.fn(),
        onsuccess: jest.fn(function(this: any) {
            this.result = {
                transaction: jest.fn(() => ({
                    objectStore: jest.fn()
                }))
            };
            if (typeof this.onsuccess === 'function') {
                this.onsuccess();
            }
        })
    }))
};
global.indexedDB = indexedDB as any;

// Mock crypto
const mockCrypto = {
    subtle: {
        generateKey: jest.fn(() => Promise.resolve('mock-key')),
        encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
        decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
        importKey: jest.fn(() => Promise.resolve('mock-imported-key'))
    },
    getRandomValues: jest.fn(() => new Uint8Array(32))
};
global.crypto = mockCrypto as any;

// Log our test setup
console.log('Setting up InAppWalletContext test suite');

jest.mock("@hashgraph/sdk", () => {
    console.log('Mocking @hashgraph/sdk');
    return {
        Client: {
            forTestnet: jest.fn(() => ({
                setOperator: jest.fn(),
                execute: jest.fn(),
                getReceipt: jest.fn()
            }))
        },
        AccountId: {
            fromString: jest.fn((id) => ({ toString: () => id }))
        },
        PrivateKey: {
            fromString: jest.fn((key) => ({ toString: () => key })),
            generateED25519: jest.fn().mockImplementation(() => ({
                publicKey: { 
                    toString: () => "302a300506032b6570032100e0c8ec2758a5879ffac226a13c0c516b799e72e35141a0dd828f94d37988a4b7",
                    toBytes: () => new Uint8Array([1,2,3]),
                    _toProtobufKey: () => ({ key: new Uint8Array([1,2,3]) })
                },
                toString: () => "302e020100300506032b657004220420db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10"
            }))
        },
        AccountCreateTransaction: jest.fn().mockImplementation(() => ({
            setKey: jest.fn().mockReturnThis(),
            setInitialBalance: jest.fn().mockReturnThis(),
            setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({
                getReceipt: jest.fn().mockResolvedValue({
                    accountId: { toString: () => '0.0.123456' }
                })
            })
        })),
        Hbar: jest.fn(amount => ({ toString: () => `${amount} ℏ` }))
    };
});

// Mock storage utilities
jest.mock('@/lib/utils/keyStorage', () => ({
    storePrivateKey: jest.fn(() => Promise.resolve()),
    retrievePrivateKey: jest.fn(() => Promise.resolve("mockPrivateKey")),
    encrypt: jest.fn(() => Promise.resolve("encryptedKey")),
    decrypt: jest.fn(() => Promise.resolve("decryptedKey"))
}));

// Mock fetch with proper types
global.fetch = jest.fn().mockImplementation((url: string | URL | Request) => {
    console.log('Fetch called with:', url);
    
    if (url.toString().includes('/api/wallet/create-account')) {
        return Promise.resolve(new Response(
            JSON.stringify({ accountId: '0.0.123456', userId: 'test-user-id' }),
            { status: 200, headers: { 'Content-Type': 'application/json' }}
        ));
    }
    
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
});

// Add base URL for tests
const TEST_BASE_URL = 'http://localhost:3000';

// Test component
const TestComponent = () => {
    const wallet = useInAppWallet();
    return (
        <div>
            <div data-testid="account">{wallet.inAppAccount || 'No Account'}</div>
            <div data-testid="userId">{wallet.userId || 'No UserId'}</div>
            <button onClick={() => wallet.createWallet()} data-testid="create-wallet">
                Create Wallet
            </button>
            <button onClick={() => wallet.backupKey()} data-testid="backup-key">
                Backup Key
            </button>
        </div>
    );
};

describe('InAppWalletContext', () => {
    let client: Client;

    beforeEach(async () => {
        console.log('\nSetting up test environment');
        jest.clearAllMocks();
        
        // Set up testnet client with logging
        console.log('Creating Hedera testnet client');
        client = Client.forTestnet();
        
        console.log('Setting up operator with ID:', "0.0.4340026");
        const operatorId = AccountId.fromString("0.0.4340026");
        const operatorKey = PrivateKey.fromString("c7fa62a9803edf904b38875b02ac4679c4832487bb1dc143ed768ad6d9811d46");
        client.setOperator(operatorId, operatorKey);

        // Mock key generation with proper SDK types
        const mockKeyPair = {
            publicKey: { 
                toString: () => "302a300506032b6570032100e0c8ec2758a5879ffac226a13c0c516b799e72e35141a0dd828f94d37988a4b7",
                toBytes: () => new Uint8Array([1,2,3]),
                _toProtobufKey: () => ({ key: new Uint8Array([1,2,3]) })
            },
            toString: () => "302e020100300506032b657004220420db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10"
        };
        
        // Mock API responses - no real Hedera calls
        (global.fetch as jest.Mock)
            .mockImplementation((url: string | URL | Request) => {
                console.log('Fetch called with:', url);
                
                if (url.toString().includes('/api/wallet/create-account')) {
                    return Promise.resolve(new Response(
                        JSON.stringify({ accountId: '0.0.123456', userId: 'test-user-id' }),
                        { status: 200, headers: { 'Content-Type': 'application/json' }}
                    ));
                }
                
                return Promise.reject(new Error(`Unexpected URL: ${url}`));
            });
    });

    it('should create a real testnet account', async () => {
        console.log('\nStarting account creation test');
        
        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        console.log('Clicking create wallet button');
        await act(async () => {
            fireEvent.click(screen.getByTestId('create-wallet'));
        });

        await waitFor(() => {
            const accountElement = screen.getByTestId('account');
            const accountId = accountElement.textContent;
            console.log('Created account ID:', accountId);
            expect(accountId).toMatch(/^0\.0\.\d+$/);
        });
    });

    it('should handle key backup', async () => {
        // Mock PrivateKey.generateED25519() first
        (PrivateKey.generateED25519 as jest.Mock).mockImplementation(() => ({
            publicKey: { toString: () => "mockPublicKey" },
            toString: () => "mockPrivateKey"
        }));

        // Mock API responses - no real Hedera calls
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ accountId: '0.0.123456' })
            }))
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    accountId: '0.0.123456',
                    userId: 'test-user-id'
                })
            }));

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId('create-wallet'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('account')).toHaveTextContent('0.0.123456');
            expect(screen.getByTestId('userId')).toHaveTextContent('test-user-id');
        });
    });

    it('should handle errors gracefully', async () => {
        // Clear previous mocks
        (global.fetch as jest.Mock).mockReset();
        
        // Mock a failed Hedera account creation
        (global.fetch as jest.Mock).mockImplementationOnce(() => 
            Promise.resolve(new Response(
                JSON.stringify({ error: 'Failed to create wallet' }),
                { 
                    status: 400,
                    statusText: 'Bad Request',
                    headers: { 'Content-Type': 'application/json' }
                }
            ))
        );

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId('create-wallet'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('account')).toHaveTextContent('No Account');
        });
    });

    it('should create a wallet with proper return values', async () => {
        // Mock PrivateKey.generateED25519() first
        (PrivateKey.generateED25519 as jest.Mock).mockImplementation(() => ({
            publicKey: { toString: () => "mockPublicKey" },
            toString: () => "mockPrivateKey"
        }));

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId('create-wallet'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('account')).toHaveTextContent('0.0.123456');
            expect(screen.getByTestId('privateKey')).toHaveTextContent('mockPrivateKey');
        });
    });

    it('should handle session expiry during wallet creation', async () => {
        // Mock fetch to simulate 401
        (global.fetch as jest.Mock).mockImplementationOnce(() => 
            Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Session expired' })
            })
        );

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId('create-wallet'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Session expired');
        });
    });
}); 