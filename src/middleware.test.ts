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

jest.mock('@upstash/redis')
jest.mock('@/lib/utils/rateLimiter', () => ({
    getRedisInstance: jest.fn(),
    rateLimit: jest.fn().mockImplementation(() => Promise.resolve({
        limit: 5,
        remaining: 4,
        success: true,
        toString: () => 'rate-limit-key'
    }))
}))

// Mock NextResponse.json to return a proper Response object
const mockJson = jest.fn().mockImplementation((body, init) => {
    const headers = new Headers(init?.headers)
    const statusCode = init?.status || 200
    const response = new Response(JSON.stringify(body), {
        ...init,
        headers,
        status: statusCode
    })
    // Create a new headers object to avoid recursion
    const responseHeaders = new Headers(response.headers)
    Object.defineProperty(response, 'headers', {
        get: () => responseHeaders
    })
    // Store status separately to avoid recursion
    Object.defineProperty(response, 'status', {
        get: () => statusCode
    })
    return response
})
NextResponse.json = mockJson

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
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({
            count: 6,
            timestamp: Date.now()
        }))

        const req = new NextRequest(new URL('http://localhost/api/wallet/create'), {
            method: 'POST'
        })

        const response = await middleware(req)
        expect(response.status).toBe(429)
        const data = await response.json()
        expect(data.error).toBe('Too many requests')
    })

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
        mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'))

        const req = new NextRequest(new URL('http://localhost/api/wallet/create'), {
            method: 'POST'
        })

        const response = await middleware(req)
        expect(response.status).toBe(503)
        const data = await response.json()
        expect(data.error).toBe('Service temporarily unavailable')
    })

    it('should skip rate limiting for non-API routes', async () => {
        const req = new NextRequest(new URL('http://localhost/about'), {
            method: 'GET'
        })

        const response = await middleware(req)
        expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
    })
}) 