import { POST } from './route';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/utils/supabase';
import { NextRequest } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";

// Mock cookies
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('mock-cookie'),
        getAll: jest.fn().mockReturnValue([{ name: 'sb-token', value: 'mock-token' }]),
        set: jest.fn()
    })
}));

// Mock rate limiter
jest.mock('@/middleware/rateLimiter', () => ({
    rateLimiterMiddleware: jest.fn().mockResolvedValue({ status: 200 })
}));

// Mock createServerSupabase
jest.mock('@/utils/supabase', () => ({
    createServerSupabase: jest.fn().mockReturnValue({
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null
            })
        },
        from: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
            })
        })
    })
}));

// Mock Hedera SDK
jest.mock('@hashgraph/sdk', () => ({
    Client: {
        forName: jest.fn().mockReturnValue({
            setOperator: jest.fn()
        })
    },
    AccountCreateTransaction: jest.fn().mockReturnValue({
        setKey: jest.fn().mockReturnThis(),
        setInitialBalance: jest.fn().mockReturnThis(),
        setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            getReceipt: jest.fn().mockResolvedValue({
                accountId: { toString: () => '0.0.123456' }
            })
        })
    }),
    PrivateKey: {
        generateED25519: jest.fn().mockReturnValue({
            publicKey: { toString: () => 'mockPublicKey' },
            toString: () => 'mockPrivateKey'
        }),
        fromString: jest.fn().mockReturnValue({
            publicKey: { toString: () => 'mockPublicKey' },
            toString: () => 'mockPrivateKey'
        })
    },
    AccountId: { fromString: jest.fn() },
    Hbar: jest.fn()
}));

// Mock NextResponse
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn().mockImplementation((data) => ({
            status: 200,
            json: () => Promise.resolve(data)
        }))
    }
}));

describe('POST /api/wallet/create-account', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a Hedera account successfully', async () => {
        // Setup mock functions we want to verify
        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        const fromMock = jest.fn().mockReturnValue({ update: updateMock });
        
        // Update the createServerSupabase mock for this test
        (createServerSupabase as jest.Mock).mockReturnValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id' } },
                    error: null
                })
            },
            from: fromMock
        });

        const req = new Request('http://localhost/api/wallet/create-account', {
            method: 'POST'
        }) as unknown as NextRequest;

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            accountId: '0.0.123456',
            privateKey: 'mockPrivateKey'
        });

        // Verify the mock calls
        expect(fromMock).toHaveBeenCalledWith('Users');
        expect(updateMock).toHaveBeenCalledWith({ hederaAccountId: '0.0.123456' });
    });
}); 