import { rateLimit, getRedisInstance } from './rateLimiter';
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// Mock the Redis client according to Upstash's actual response format
jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
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
                [null, true]
            ])
        })
    }))
}));

describe('Rate Limiter', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        mockRequest = {
            ip: '127.0.0.1',
            headers: new Headers()
        } as NextRequest;
        
        // Mock cookies
        Object.defineProperty(mockRequest, 'cookies', {
            get: () => new Map([['session', { value: 'test-session' }]])
        });
        
        jest.clearAllMocks();
    });

    it('should allow requests within limit', async () => {
        const result = await rateLimit(mockRequest, 'auth');
        expect(result.blocked).toBe(false);
        expect(result.remaining).toBeGreaterThan(0);
        expect(result.limit).toBe(5);
    });

    it('should block requests over limit', async () => {
        // Get the singleton Redis instance
        const redis = getRedisInstance();

        // Mock the pipeline method to return over-limit values
        jest.spyOn(redis, 'pipeline').mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            pexpire: jest.fn().mockReturnThis(),
            get: jest.fn().mockReturnThis(),
            setex: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([
                [null, 6],  // First incr returns 6 (over limit)
                [null, true],
                [null, 6],  // Second incr returns 6 (over limit)
                [null, true],
                [null, '0'],  // blockCount
                [null, true]
            ])
        } as any);
        
        const result = await rateLimit(mockRequest, 'auth');
        expect(result.blocked).toBe(true);
        expect(result.remaining).toBe(0);
    });

    it('should handle different rate limit types', async () => {
        const authResult = await rateLimit(mockRequest, 'auth');
        const walletResult = await rateLimit(mockRequest, 'wallet');
        const resetResult = await rateLimit(mockRequest, 'reset');
        
        expect(authResult.limit).toBe(5);
        expect(walletResult.limit).toBe(10);
        expect(resetResult.limit).toBe(3);
    });

    it('should reset after window expires', async () => {
        jest.useFakeTimers();
        const now = Date.now();
        
        const redis = getRedisInstance();
        
        // First request
        jest.spyOn(redis, 'pipeline').mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            pexpire: jest.fn().mockReturnThis(),
            get: jest.fn().mockReturnThis(),
            setex: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([
                [null, 1],  // First request count
                [null, true],
                [null, 1],
                [null, true]
            ])
        } as any);
        
        const result1 = await rateLimit(mockRequest, 'auth');
        
        jest.setSystemTime(now + 61000); // 61 seconds later
        
        // Second request after window expires
        jest.spyOn(redis, 'pipeline').mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            pexpire: jest.fn().mockReturnThis(),
            get: jest.fn().mockReturnThis(),
            setex: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([
                [null, 1],  // New window starts at 1
                [null, true],
                [null, 1],
                [null, true]
            ])
        } as any);
        
        const result2 = await rateLimit(mockRequest, 'auth');
        
        expect(result2.remaining).toBe(result2.limit - 1);
        
        jest.useRealTimers();
    });

    it('should handle Redis errors gracefully', async () => {
        const redis = getRedisInstance();
        
        // Mock both multi and pipeline to throw errors
        jest.spyOn(redis, 'multi').mockImplementation(() => {
            throw new Error('Redis connection error');
        });
        
        jest.spyOn(redis, 'pipeline').mockImplementation(() => {
            throw new Error('Redis connection error');
        });

        const result = await rateLimit(mockRequest, 'auth');
        expect(result.blocked).toBe(false);
    });
}); 