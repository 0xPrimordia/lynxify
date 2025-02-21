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

describe('Middleware Integration', () => {
    let mockRedis: jest.Mocked<Redis>

    beforeEach(() => {
        mockRedis = {
            incr: jest.fn(),
            expire: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            pipeline: jest.fn().mockReturnValue({
                incr: jest.fn(),
                expire: jest.fn(),
                exec: jest.fn().mockResolvedValue([])
            })
        } as unknown as jest.Mocked<Redis>;
        (getRedisInstance as jest.Mock).mockReturnValue(mockRedis);

        jest.clearAllMocks();
    })

    it('should apply rate limiting to wallet creation endpoint', async () => {
        const url = new URL('http://localhost/api/wallet/create')
        const headers = new Headers()
        headers.set('cookie', '')
        
        const req = new NextRequest(url, {
            method: 'POST',
            headers
        })
        
        const response = await middleware(req)
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    })

    it('should block requests that exceed rate limit', async () => {
        const rateLimitModule = require('@/lib/utils/rateLimiter');
        rateLimitModule.rateLimit.mockResolvedValueOnce({
            success: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 60000,
            blocked: true
        });

        const headers = new Headers({
            'x-user-id': 'test-user',  // Add this to prevent the undefined error
            'cookie': ''
        });
        
        const req = new NextRequest(new URL('http://localhost/api/wallet/create'), {
            method: 'POST',
            headers
        });

        const response = await middleware(req);
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toBe('Too many requests');
    });

    it('should allow requests within rate limit', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({
            count: 2,
            timestamp: Date.now()
        }))

        const req = new NextRequest(new URL('http://localhost/api/wallet/create'), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer valid-token'
            }
        })

        const response = await middleware(req)
        expect(response.status).not.toBe(429)
    })

    it('should handle rate limiter failures gracefully', async () => {
        const rateLimitModule = require('@/lib/utils/rateLimiter');
        rateLimitModule.rateLimit.mockRejectedValueOnce(new Error('Redis connection failed'));

        const req = new NextRequest(new URL('http://localhost/api/wallet/create'), {
            method: 'POST'
        });

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
}) 