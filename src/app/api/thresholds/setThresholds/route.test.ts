import { POST } from './route';
import { createServerSupabase } from '@/utils/supabase';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { Client, AccountId, PrivateKey, ContractId } from '@hashgraph/sdk';
import { User, Threshold } from '@/app/types';

// Mock Next.js components
jest.mock('next/server', () => ({
    NextRequest: jest.fn(),
    NextResponse: {
        json: (data: any, init?: ResponseInit) => ({
            status: init?.status || 200,
            json: async () => data,
        }),
    },
}));

// Mock dependencies
jest.mock('@/utils/supabase');
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
        getAll: () => []
    })
}));

// Mock Hedera SDK
jest.mock('@hashgraph/sdk', () => ({
    Client: {
        forTestnet: jest.fn().mockReturnValue({
            setOperator: jest.fn()
        })
    },
    AccountId: {
        fromString: jest.fn().mockReturnValue('0.0.123456')
    },
    PrivateKey: {
        fromString: jest.fn().mockReturnValue('mock-private-key')
    },
    ContractId: {
        fromString: jest.fn().mockReturnValue({
            toSolidityAddress: () => '0x000000000000000000000000000000000000abcd'
        })
    },
    Long: {
        fromString: jest.fn().mockReturnValue('1000000000')
    },
    ContractExecuteTransaction: jest.fn().mockReturnValue({
        setContractId: jest.fn().mockReturnThis(),
        setGas: jest.fn().mockReturnThis(),
        setFunction: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            getReceipt: jest.fn().mockResolvedValue({ status: { toString: () => 'SUCCESS' } }),
            transactionId: { toString: () => 'mock-tx-id' }
        })
    }),
    ContractFunctionParameters: jest.fn().mockImplementation(() => ({
        addUint256: jest.fn().mockReturnThis(),
        addString: jest.fn().mockReturnThis(),
        addAddress: jest.fn().mockReturnThis()
    }))
}));

// Mock process.env
process.env.NEXT_PUBLIC_HEDERA_NETWORK = 'testnet';
process.env.NEXT_PUBLIC_OPERATOR_ID = '0.0.123456';
process.env.OPERATOR_KEY = 'mock-operator-key';
process.env.CONTRACT_ADDRESS_HEDERA = '0.0.789012';

// Helper to create mock request with proper headers
const createRequest = (body: any, userId: string | null = 'test-user-id') => {
    const headers = new Headers({
        'Content-Type': 'application/json'
    });
    
    if (userId) {
        headers.set('x-user-id', userId);
    }

    return {
        json: () => Promise.resolve(body),
        headers,
        method: 'POST'
    } as unknown as NextRequest;
};

describe('setThresholds API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 when no user ID is provided', async () => {
        const request = createRequest({}, null);

        const response = await POST(request);
        expect(response.status).toBe(401);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            error: 'Unauthorized',
            details: 'No user session found'
        });
    });

    it('should return 401 when user is not found in database', async () => {
        // Mock Supabase with admin mode
        (createServerSupabase as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ 
                    data: null, 
                    error: null 
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50,
            type: 'stopLoss' as const,
            price: 1.0,
            cap: 1000,
            tokenA: '0.0.123456',
            tokenB: '0.0.789012',
            fee: 100
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            error: 'Unauthorized',
            details: 'Account not found or unauthorized'
        });
    });

    it('should successfully create threshold for authenticated user', async () => {
        const mockUser: User = {
            id: 'test-user-id',
            hederaAccountId: '0.0.123456',
            created_at: new Date().toISOString()
        };

        const mockThreshold: Threshold = {
            id: 1,
            userId: mockUser.id,
            type: 'stopLoss',
            price: 1.0,
            cap: 1000,
            hederaAccountId: '0.0.123456',
            tokenA: '0.0.123456',
            tokenB: '0.0.789012',
            fee: 100,
            isActive: false,
            lastError: '',
            lastChecked: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            lastExecutedAt: new Date().toISOString(),
            txHash: '',
            slippageBasisPoints: 50,
            testnet: true
        };

        // Mock Supabase with complete chain
        (createServerSupabase as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ 
                    data: mockUser, 
                    error: null 
                }),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: mockThreshold,
                        error: null
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { ...mockThreshold, status: 'active' },
                                error: null
                            })
                        })
                    })
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50,
            type: 'stopLoss' as const,
            price: 1.0,
            cap: 1000,
            tokenA: '0.0.123456',
            tokenB: '0.0.789012',
            fee: 100
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            message: 'Threshold set successfully',
            id: mockThreshold.id,
            txHash: 'mock-tx-id'
        });
    });

    it('should return 500 when database insert fails', async () => {
        // Mock Supabase with admin mode
        (createServerSupabase as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn()
                    .mockResolvedValueOnce({ 
                        data: { id: 'test-user-id', hederaAccountId: '0.0.123456' }, 
                        error: null 
                    })
                    .mockResolvedValueOnce({
                        data: null,
                        error: { message: 'Database error' }
                    }),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Database error' }
                    })
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50,
            type: 'stopLoss' as const,
            price: 1.0,
            cap: 1000,
            tokenA: '0.0.123456',
            tokenB: '0.0.789012',
            fee: 100
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            error: 'Failed to create threshold record: Database error'
        });
    });
}); 