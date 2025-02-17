import { POST } from './route';
import { createServerSupabase } from '@/utils/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, AccountId, PrivateKey, ContractId } from '@hashgraph/sdk';

// Mock dependencies
jest.mock('@/utils/supabase');
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn()
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
            toSolidityAddress: () => '000000000000000000000000000000000000abcd'
        })
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
    ContractFunctionParameters: jest.fn().mockReturnValue({
        addUint256: jest.fn().mockReturnThis(),
        addString: jest.fn().mockReturnThis(),
        addAddress: jest.fn().mockReturnThis()
    })
}));

// Mock NextResponse properly for constructor usage
jest.mock('next/server', () => {
    const actual = jest.requireActual('next/server');
    return {
        ...actual,
        NextResponse: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body)
        }))
    };
});

// Mock process.env
process.env.NEXT_PUBLIC_OPERATOR_ID = '0.0.123456';
process.env.OPERATOR_KEY = 'mock-operator-key';
process.env.CONTRACT_ADDRESS_HEDERA = '0.0.789012';

// Mock NextRequest
const createRequest = (body: any) => {
    return {
        json: () => Promise.resolve(body)
    } as unknown as NextRequest;
};

describe('setThresholds API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock Supabase with complete CRUD operations
        (createServerSupabase as jest.Mock).mockReturnValue({
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                })
            },
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn()
                    })
                }),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn()
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn()
                    })
                })
            })
        });
    });

    it('should return 401 when user is not found', async () => {
        // Mock user lookup to return null
        (createServerSupabase as jest.Mock).mockReturnValue({
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                })
            },
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ 
                            data: null,
                            error: null 
                        })
                    })
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            error: 'Unauthorized',
            details: 'Account not found or unauthorized'
        });
    });

    it('should successfully set thresholds for authenticated user', async () => {
        // Mock successful user lookup and updates
        (createServerSupabase as jest.Mock).mockReturnValue({
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                })
            },
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ 
                            data: { id: 'test-user-id', hedera_account_id: '0.0.123456' }, 
                            error: null 
                        })
                    })
                }),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'threshold-id' },
                            error: null
                        })
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockResolvedValue({
                            data: [{ id: 'threshold-id' }],
                            error: null
                        })
                    })
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50,
            price: 1.0,
            cap: 1000,
            tokenA: '0.0.123456',
            tokenB: '0.0.789012'
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            message: 'Threshold set successfully',
            txHash: 'mock-tx-id',
            id: 'threshold-id'
        });
    });

    it('should return 500 for database errors', async () => {
        (createServerSupabase as jest.Mock).mockReturnValue({
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                })
            },
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ 
                            data: { id: 'test-user-id' }, 
                            error: null 
                        })
                    })
                }),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ 
                            error: { message: 'Database error' } 
                        })
                    })
                })
            })
        });

        const request = createRequest({
            hederaAccountId: '0.0.123456',
            slippageBasisPoints: 50
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        
        const responseData = await response.json();
        expect(responseData).toEqual({
            error: 'Failed to create threshold record: Database error'
        });
    });
}); 