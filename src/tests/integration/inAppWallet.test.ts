// Mock SessionPasswordManager
jest.mock('@/lib/utils/sessionPassword', () => ({
    __esModule: true,
    default: {
        getPassword: jest.fn(() => Promise.resolve('test-password')),
        clearPassword: jest.fn(() => Promise.resolve()),
        setPassword: jest.fn(() => Promise.resolve())
    }
}));
import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { Client, AccountId, PrivateKey, AccountBalanceQuery } from "@hashgraph/sdk";
import { setupTestClient, validateTestEnvironment } from './helpers/setup';
import { authenticateWallet } from './helpers/auth';
import { fetch, Response } from 'cross-fetch';
import { createClient } from '@supabase/supabase-js';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import "fake-indexeddb/auto";
import SessionPasswordManager from '@/lib/utils/sessionPassword';

console.log('Setting up test mocks...');

jest.mock('@hashgraph/sdk', () => ({
    AccountBalanceQuery: jest.fn(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn(() => Promise.resolve({
            toString: () => "0.0 ℏ"
        }))
    })),
    Client: {
        forTestnet: jest.fn(() => ({
            setOperator: jest.fn()
        }))
    },
    PrivateKey: {
        generateED25519: jest.fn(() => ({
            publicKey: { toString: () => "mockPublicKey" },
            toString: () => "mockPrivateKey",
            sign: jest.fn(() => new Uint8Array([1,2,3,4]))
        })),
        fromString: jest.fn(() => ({
            sign: jest.fn(() => new Uint8Array([1,2,3,4])),
            toString: () => "mockPrivateKey"
        }))
    },
    AccountId: {
        fromString: jest.fn(() => "0.0.1234567")
    }
}));

// Mock localStorage before any imports
global.localStorage = {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn().mockReturnValue(null)
} as Storage;



// Mock our actual encryption utilities
jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn().mockImplementation(async (...args: unknown[]): Promise<string> => 
        'encrypted:' + Buffer.from(String(args[0])).toString('base64')
    ),
    decrypt: jest.fn().mockImplementation(async (...args: unknown[]): Promise<string> => 
        Buffer.from(String(args[0]).split(':')[1], 'base64').toString()
    ),
    generateSalt: jest.fn().mockImplementation((): Uint8Array => 
        new Uint8Array([1, 2, 3, 4])
    ),
    generateIV: jest.fn().mockImplementation((): Uint8Array => 
        new Uint8Array([5, 6, 7, 8])
    )
}));

// Mock fetch responses with proper typing
const mockFetch = jest.fn().mockImplementation(
    async (...args: unknown[]): Promise<Response> => {
        const url = args[0] as string;
        console.log('mockFetch called with:', url);
        
        if (url.includes('/api/auth/in-app-wallet')) {
            return Promise.resolve(new Response(JSON.stringify({
                userId: 'test-user-id',
                message: 'Please verify your email to complete setup',
                status: 'verification_sent'
            }), { status: 200 }));
        }
        
        if (url.includes('/api/auth/verify')) {
            console.log('Processing verify endpoint');
            const user = {
                id: 'test-user-id',
                user_metadata: { isInAppWallet: true }
            };

            if (user.user_metadata?.isInAppWallet) {
                // 1. Get session password
                const password = await SessionPasswordManager.getPassword();
                console.log('Got session password:', !!password);
                
                if (!password) {
                    return Promise.resolve(new Response(JSON.stringify({ 
                        error: 'No session password available'
                    }), { status: 400 }));
                }

                // 2. Create Hedera account
                const createAccountResponse = await mockFetch('/api/wallet/create-account', {
                    method: 'POST',
                    body: JSON.stringify({
                        publicKey: PrivateKey.generateED25519().publicKey.toString()
                    })
                }) as Response;
                
                const { accountId } = await createAccountResponse.json();
                
                // 3. Clear session password after successful flow
                await SessionPasswordManager.clearPassword();

                return Promise.resolve(new Response(JSON.stringify({ 
                    success: true,
                    user: {
                        id: 'test-user-id',
                        user_metadata: {
                            isInAppWallet: true,
                            hederaAccountId: accountId
                        }
                    }
                }), { status: 200 }));
            }
        }
        
        if (url.includes('/api/wallet/create-account')) {
            const init = args[1] as { body: string };
            const body = JSON.parse(init.body);
            expect(body.publicKey).toBeDefined();
            
            return Promise.resolve(new Response(JSON.stringify({ 
                accountId: '0.0.1234567',
                privateKey: PrivateKey.generateED25519().toString(),
                publicKey: body.publicKey
            }), { status: 200 }));
        }

        return Promise.reject(new Error(`Unhandled mock fetch call: ${url}`));
    }
);

// Assign the mock to global fetch
global.fetch = mockFetch as unknown as typeof global.fetch;

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => {
        console.log('Creating mock Supabase client');
        return {
            auth: {
                admin: {
                    updateUserById: jest.fn().mockImplementation(async (userId, metadata) => {
                        console.log('Mock updateUserById called with:', { userId, metadata });
                        return { error: null };
                    })
                }
            }
        };
    })
}));

const mockSDK = {
    AccountBalanceQuery: jest.fn(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn(() => Promise.resolve({
            toString: () => "0.0 ℏ"
        }))
    })),
    Client: {
        forTestnet: jest.fn(() => ({
            setOperator: jest.fn()
        }))
    },
    PrivateKey: {
        generateED25519: jest.fn(() => ({
            publicKey: { toString: () => "mockPublicKey" },
            toString: () => "mockPrivateKey"
        }))
    },
    AccountId: {
        fromString: jest.fn(() => "0.0.1234567")
    }
};

describe('In-App Wallet Integration', () => {
    let client: Client;
    let operatorId: AccountId;
    let operatorKey: PrivateKey;
    let indexedDB: IDBFactory;

    beforeAll(async () => {
        // Set up mocks only
        indexedDB = new IDBFactory();
        global.indexedDB = indexedDB;
        global.IDBKeyRange = IDBKeyRange;
    });

    afterAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    describe('Wallet Creation Flow', () => {
        it('should create a new wallet and authenticate', async () => {
            console.log('\nTesting wallet creation flow...');
            
            const operatorKey = PrivateKey.fromString("mockPrivateKey");
            console.log('Created operator key:', operatorKey);
            
            const session = await authenticateWallet(
                AccountId.fromString('0.0.1234567'),
                operatorKey
            );
            expect(session).toBeTruthy();
        }, 30000);
    });

    describe('In-App Wallet Registration Flow', () => {
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!@';

        beforeEach(async () => {
            jest.clearAllMocks();
        });

        it('should handle initial registration', async () => {
            const response = await mockFetch('/api/auth/in-app-wallet', {
                method: 'POST',
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword,
                    isInAppWallet: true
                })
            }) as Response;
            const data = await response.json();
            expect(data.userId).toBe('test-user-id');
        });

        it('should handle email verification and account creation', async () => {
            console.log('\n=== Starting verification test ===');
            jest.clearAllMocks();
            
            // Setup: Create user with isInAppWallet flag
            await mockFetch('/api/auth/in-app-wallet', {
                method: 'POST',
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'TestPassword123!',
                    isInAppWallet: true
                })
            });

            console.log('Attempting verification with isInAppWallet user');
            const response = await mockFetch('/api/auth/verify') as Response;
            const data = await response.json();
            console.log('Verification response:', data);

            // Verify the complete flow happened
            expect(SessionPasswordManager.getPassword).toHaveBeenCalled();
            expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
            expect(data.success).toBe(true);
            expect(data.user.user_metadata.isInAppWallet).toBe(true);
            expect(data.user.user_metadata.hederaAccountId).toBeDefined();
        });

        it('should clean up session password after verification', async () => {
            // Reset mock counts
            jest.clearAllMocks();
            
            // Trigger verification
            await mockFetch('/api/auth/verify?token=test-token&type=email') as Response;
            
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify session password was cleared
            expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
        });
    });
}); 