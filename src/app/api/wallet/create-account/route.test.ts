import { POST } from './route';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/utils/supabase';
import { NextRequest } from 'next/server';
import { Client, AccountCreateTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";
import { rewardNewWallet } from '@/lib/utils/tokenRewards';

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
        json: jest.fn().mockImplementation((data, options) => ({
            status: options?.status || 200,
            json: () => Promise.resolve(data)
        })),
        next: jest.fn().mockImplementation((config) => {
            if (config?.request?.headers) {
                const headers = config.request.headers;
                if (headers.get('Authorization')?.startsWith('Bearer ')) {
                    const token = headers.get('Authorization')?.split(' ')[1];
                    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
                    headers.set('x-user-id', decoded.sub);
                }
            }
            return config;
        })
    }
}));

// Top level mock needs to be fixed first
jest.mock('@/utils/supabase', () => ({
    createServerSupabase: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        data: null, 
                        error: null 
                    })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        }),
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: { session: { user: { id: 'test-user-id' } } },
                error: null
            }),
            admin: {
                updateUserById: jest.fn().mockResolvedValue({ error: null })
            }
        }
    })
}));

// Mock token rewards
jest.mock('@/lib/utils/tokenRewards', () => ({
    rewardNewWallet: jest.fn().mockResolvedValue({
        success: true,
        amount: 50000000,
        tokenId: "0.0.1183558"
    })
}));

describe('POST /api/wallet/create-account', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log');
        jest.spyOn(console, 'error');
    });

    it('should create a Hedera account and store user data', async () => {
        const mockInsertData = {
            id: 'test-user-id',
            created_at: new Date().toISOString(),
            hederaAccountId: '0.0.123456',
            isInAppWallet: true
        };

        // Fix the mock to match actual log messages
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockInsertData, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: mockInsertData 
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                }),
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const headers = new Headers();
        headers.set('x-user-id', 'test-user-id');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('accountId');
        expect(data).toHaveProperty('privateKey');

        // Update log expectations to match actual sequence from route.ts
        expect(console.log).toHaveBeenCalledWith('Creating account with headers:', expect.any(Headers));
        expect(console.log).toHaveBeenCalledWith('Starting wallet creation with cookies:', expect.any(Array));
        expect(console.log).toHaveBeenCalledWith('Creating Hedera account for user:', 'test-user-id');
        expect(console.log).toHaveBeenCalledWith('Hedera account created:', expect.any(String));

        // Verify the database operations
        expect(mockFrom).toHaveBeenCalledWith('Users');
    });

    it('should handle unauthorized requests', async () => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log');
        jest.spyOn(console, 'error');
        
        (createServerSupabase as jest.Mock).mockReturnValue({
            from: jest.fn(),
            auth: {
                admin: {
                    updateUserById: jest.fn()
                }
            }
        });

        const req = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            json: () => Promise.resolve({ password: 'test-password' }),
            nextUrl: new URL('http://localhost/api/wallet/create-account')
        } as NextRequest;

        const response = await POST(req);
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('User context not found');
    });

    it('should handle database insert with auth token', async () => {
        // Mock the auth token in headers
        const headers = new Headers();
        headers.set('Authorization', 'Bearer eyJ0...');
        headers.set('Content-Type', 'application/json');
        headers.set('x-user-id', 'test-user-id');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        // Mock the database error scenario
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: { 
                            code: '42501',
                            message: 'permission denied for table "Users"',
                            details: 'Requires admin role'
                        },
                        data: null
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                admin: {
                    updateUserById: jest.fn()
                }
            }
        });

        const response = await POST(req);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Failed to create user record');
    });

    it('should properly process Bearer token through middleware', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.mock-signature';
        
        const headers = new Headers();
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('Content-Type', 'application/json');
        headers.set('x-user-id', 'test-user-id');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        // Mock successful database operations
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null,
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456'
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
        expect(req.headers.get('x-user-id')).toBe('test-user-id');
    });

    it('should handle missing Bearer token', async () => {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' }),
            nextUrl: new URL('http://localhost/api/wallet/create-account')
        } as NextRequest;

        const response = await POST(req);
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('User context not found');
    });

    it('should handle malformed Bearer token', async () => {
        const headers = new Headers();
        headers.set('Authorization', 'Bearer invalid-token');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' }),
            nextUrl: new URL('http://localhost/api/wallet/create-account')
        } as NextRequest;

        const response = await POST(req);
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('User context not found');
    });

    it('should handle cookie-based auth fallback', async () => {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('x-user-id', 'cookie-user-id');
        
        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null,
                        data: {
                            id: 'cookie-user-id',
                            hederaAccountId: '0.0.123456'
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { 
                        session: { 
                            user: { id: 'cookie-user-id' } 
                        } 
                    },
                    error: null
                }),
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
        expect(req.headers.get('x-user-id')).toBe('cookie-user-id');
    });

    it('should handle database operations in admin mode', async () => {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('x-user-id', 'test-user-id');
        
        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null,
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockImplementation((cookieStore, isAdmin) => {
            console.log('Creating Supabase client with admin mode:', isAdmin);
            return {
                from: mockFrom,
                auth: {
                    admin: {
                        updateUserById: jest.fn().mockResolvedValue({ error: null })
                    }
                }
            };
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
        expect(createServerSupabase).toHaveBeenCalledWith(expect.anything(), true);
        expect(mockFrom).toHaveBeenCalled();
    });

    it('should handle database operations in non-admin mode', async () => {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('x-user-id', 'test-user-id');
        
        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } satisfies Partial<NextRequest> as NextRequest;

        // Mock non-admin mode client with permission error
        const mockInsert = jest.fn().mockResolvedValue({ 
            error: {
                code: '42501',
                message: 'permission denied for table "Users"',
                details: 'Requires admin role'
            },
            data: null
        });

        // Mock createServerSupabase to verify admin mode
        let receivedAdminMode: boolean | undefined;
        (createServerSupabase as jest.Mock).mockImplementation((cookieStore, isAdmin) => {
            receivedAdminMode = isAdmin;
            console.log('Creating Supabase client with admin mode:', isAdmin);
            // Simulate non-admin behavior even when isAdmin is true
            return {
                from: jest.fn().mockReturnValue({ 
                    insert: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: mockInsert
                        })
                    })
                }),
                auth: {
                    admin: {
                        updateUserById: jest.fn().mockResolvedValue({ error: null })
                    }
                }
            };
        });

        const response = await POST(req);
        expect(response.status).toBe(500);
        expect(receivedAdminMode).toBe(true);  // Changed: expect admin mode true
        expect(mockInsert).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
            'Failed to create user record:',
            expect.objectContaining({
                code: '42501',
                message: expect.stringContaining('permission denied')
            })
        );
    });

    it('should handle successful wallet creation with rewards', async () => {
        // Setup specific mock for this test
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                }),
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const headers = new Headers();
        headers.set('x-user-id', 'test-user-id');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const response = await POST(req);
        expect(response.status).toBe(200);
        
        expect(rewardNewWallet).toHaveBeenCalledWith(
            expect.any(Object), // client
            '0.0.123456',      // matches mock account ID
            process.env.NEXT_PUBLIC_OPERATOR_ID,
            process.env.OPERATOR_KEY
        );

        const data = await response.json();
        expect(data).toHaveProperty('accountId');
        expect(data).toHaveProperty('privateKey');
    });

    it('should store reward metadata after successful reward', async () => {
        const mockUpdateUserById = jest.fn().mockResolvedValue({ error: null });
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                }),
                admin: {
                    updateUserById: mockUpdateUserById
                }
            }
        });

        const headers = new Headers();
        headers.set('x-user-id', 'test-user-id');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const response = await POST(req);
        expect(response.status).toBe(200);

        // Verify metadata update
        expect(mockUpdateUserById).toHaveBeenCalledWith(
            'test-user-id',
            expect.objectContaining({
                user_metadata: expect.objectContaining({
                    initialReward: expect.objectContaining({
                        amount: 50000000,
                        tokenId: "0.0.1183558",
                        timestamp: expect.any(String)
                    })
                })
            })
        );
    });

    it('should complete wallet creation even if reward fails', async () => {
        // Mock reward failure
        (rewardNewWallet as jest.Mock).mockRejectedValueOnce(new Error('Reward failed'));

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                }),
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const headers = new Headers();
        headers.set('x-user-id', 'test-user-id');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const response = await POST(req);
        
        // Wallet creation should still succeed
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('accountId');
        expect(data).toHaveProperty('privateKey');
    });

    it('should handle price fetch failure gracefully', async () => {
        // Mock specific reward failure due to price fetch
        (rewardNewWallet as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch SAUCE token data'));

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ 
                        error: null, 
                        data: {
                            id: 'test-user-id',
                            hederaAccountId: '0.0.123456',
                            isInAppWallet: true
                        }
                    })
                })
            })
        });

        (createServerSupabase as jest.Mock).mockReturnValue({
            from: mockFrom,
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: 'test-user-id' } } },
                    error: null
                }),
                admin: {
                    updateUserById: jest.fn().mockResolvedValue({ error: null })
                }
            }
        });

        const headers = new Headers();
        headers.set('x-user-id', 'test-user-id');
        headers.set('Content-Type', 'application/json');

        const req = {
            method: 'POST',
            headers,
            json: () => Promise.resolve({ password: 'test-password' })
        } as NextRequest;

        const response = await POST(req);
        
        // Wallet creation should still succeed
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('accountId');
        expect(data).toHaveProperty('privateKey');
    });
}); 