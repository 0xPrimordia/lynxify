/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { NextRequest, NextResponse } from 'next/server'
import { middleware } from './middleware'
import { Redis } from '@upstash/redis'
import { getRedisInstance } from '@/lib/utils/rateLimiter'

// Mock the cookies implementation
jest.mock('next/dist/compiled/@edge-runtime/cookies', () => ({
    RequestCookies: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
        has: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    })),
    ResponseCookies: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        getAll: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    }))
}))

// Add SecurityMonitor mock with proper error handling
jest.mock('@/lib/monitoring/security', () => ({
    SecurityMonitor: jest.fn().mockImplementation(() => ({
        logEvent: jest.fn().mockImplementation((req, event) => {
            // Ensure we can handle undefined headers gracefully
            if (!req?.headers) {
                return Promise.resolve();
            }
            return Promise.resolve();
        })
    }))
}));

// Update rateLimiter mock to include Redis instance
jest.mock('@/lib/utils/rateLimiter', () => ({
    getRedisInstance: jest.fn(),
    rateLimit: jest.fn().mockImplementation(() => Promise.resolve({
        limit: 5,
        remaining: 4,
        success: true,
        reset: Date.now() + 60000,
        blocked: false
    })),
    getRateLimitType: jest.fn().mockImplementation((pathname) => {
        if (pathname.includes('/api/wallet/create')) return 'create';
        if (pathname.includes('/api/wallet')) return 'wallet';
        return null;
    })
}));

// Mock NextResponse.json to return a proper Response object
const mockJson = jest.fn().mockImplementation((body, init) => {
    const headers = new Headers(init?.headers || {})
    const response = new Response(JSON.stringify(body), {
        ...init,
        headers,
        status: init?.status || 200
    })
    
    // Ensure headers are properly accessible
    Object.defineProperty(response, 'headers', {
        get: () => headers,
        enumerable: true,
        configurable: true
    })
    
    // Ensure status is properly accessible
    Object.defineProperty(response, 'status', {
        get: () => init?.status || 200,
        enumerable: true,
        configurable: true
    })
    
    // Add json method
    response.json = () => Promise.resolve(body)
    return response
})
NextResponse.json = mockJson

// Mock NextResponse.next to return a proper Response object
const mockNext = jest.fn().mockImplementation(() => {
    const headers = new Headers()
    const response = new Response(null, { status: 200 })
    
    // Ensure headers are properly accessible
    Object.defineProperty(response, 'headers', {
        get: () => headers,
        enumerable: true,
        configurable: true
    })
    
    // Ensure status is properly accessible
    Object.defineProperty(response, 'status', {
        get: () => 200,
        enumerable: true,
        configurable: true
    })
    
    return response
})
NextResponse.next = mockNext

// Mock NextRequest implementation
jest.mock('next/server', () => ({
    ...jest.requireActual('next/server'),
    NextRequest: jest.fn().mockImplementation((url, init) => ({
        url,
        method: init?.method || 'GET',
        headers: init?.headers || new Headers(),
        nextUrl: { pathname: new URL(url).pathname },
        cookies: {
            get: jest.fn(),
            getAll: jest.fn().mockReturnValue([])
        },
        ip: '127.0.0.1'
    }))
}));

// Mock next/headers cookies
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockReturnValue({
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
        has: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    })
}));

// Mock createServerSupabase
jest.mock('@/utils/supabase', () => ({
    createServerSupabase: jest.fn().mockReturnValue({
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
            getSession: jest.fn().mockResolvedValue({ 
                data: { 
                    session: { 
                        user: { id: 'test-user' },
                        access_token: 'test-token'
                    } 
                }, 
                error: null 
            })
        }
    })
}));

describe('Middleware Integration', () => {
    let mockRedis: jest.Mocked<Redis>

    beforeEach(() => {
        mockRedis = {
            multi: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([null])
            }),
            pipeline: jest.fn().mockReturnValue({
                incr: jest.fn().mockReturnThis(),
                pexpire: jest.fn().mockReturnThis(),
                get: jest.fn().mockReturnThis(),
                setex: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, 1],
                    [null, true],
                    [null, 1],
                    [null, true],
                    [null, null],  // block count
                    [null, true]   // expire result
                ])
            }),
            incr: jest.fn(),
            expire: jest.fn(),
            get: jest.fn(),
            set: jest.fn()
        } as unknown as jest.Mocked<Redis>;
        (getRedisInstance as jest.Mock).mockReturnValue(mockRedis);
        
        jest.clearAllMocks();
    })

    // Helper function to create consistent request mocks
    const createMockRequest = (url: string, method = 'POST') => {
        const headers = new Headers({
            'x-user-id': 'test-user',
            'cookie': ''
        });
        
        // Create URL object first
        const urlObj = new URL(url);
        
        // Create request with explicit method and headers
        const request = new NextRequest(urlObj, {
            method: method,  // Explicitly set method
            headers: headers
        });

        // Verify the request was created correctly
        console.log('Created request:', {
            headers: Object.fromEntries(headers.entries()),
            method: request.method,
            url: request.url,
            pathname: urlObj.pathname
        });

        return request;
    };

    it('should apply rate limiting to wallet creation endpoint', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        console.log('Request before middleware:', {
            headers: Object.fromEntries(req.headers.entries()),
            method: req.method,
            url: req.url
        });
        
        const response = await middleware(req);
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('should block requests that exceed rate limit', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        const rateLimitModule = require('@/lib/utils/rateLimiter');
        rateLimitModule.rateLimit.mockResolvedValueOnce({
            success: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 60000,
            blocked: true
        });

        const response = await middleware(req);
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toBe('Too many requests');
    });

    it('should allow requests within rate limit', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({
            count: 2,
            timestamp: Date.now()
        }))

        const response = await middleware(req)
        expect(response.status).not.toBe(429)
    })

    it('should handle rate limiter failures gracefully', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        const rateLimitModule = require('@/lib/utils/rateLimiter');
        rateLimitModule.rateLimit.mockRejectedValueOnce(new Error('Redis connection failed'));

        const response = await middleware(req);
        expect(response.status).toBe(503);
        const data = await response.json();
        expect(data.error).toBe('Service temporarily unavailable');
    });

    it('should skip rate limiting for non-API routes', async () => {
        const req = new NextRequest(new URL('http://localhost/about'), {
            method: 'GET'
        });

        const response = await middleware(req);
        // For non-API routes, middleware returns NextResponse.next()
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
    })

    it('should handle Redis connection failures', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        (getRedisInstance as jest.Mock).mockImplementation(() => {
            throw new Error('Redis connection failed');
        });

        const response = await middleware(req);
        expect(response.status).toBe(503);
        
        const data = await response.json();
        expect(data.error).toBe('Service temporarily unavailable');
        expect(data.details.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should handle rate limit monitoring failures gracefully', async () => {
        const req = createMockRequest('http://localhost/api/wallet/create');
        
        // Mock pipeline to throw error
        mockRedis.pipeline.mockImplementation(() => {
            throw new Error('Redis connection failed');
        });

        // Mock getRedisInstance to ensure error propagates
        (getRedisInstance as jest.Mock).mockImplementation(() => {
            throw new Error('Redis connection failed');
        });

        const response = await middleware(req);
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe('60');
    });
}) 