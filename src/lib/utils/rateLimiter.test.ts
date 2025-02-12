import { rateLimit } from './rateLimiter';
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const MockRedis = Redis as unknown as jest.Mock;

jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        pipeline: jest.fn(() => ({
            incr: jest.fn(),
            pexpire: jest.fn(),
            exec: jest.fn().mockResolvedValue([1])
        })),
        pexpire: jest.fn().mockResolvedValue(true)
    }))
}));

describe('Rate Limiter', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        mockRequest = {
            ip: '127.0.0.1',
            headers: new Headers()
        } as NextRequest;
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should allow requests within limit', async () => {
        const result = await rateLimit(mockRequest, 'auth');
        
        expect(result.success).toBe(true);
        expect(result.remaining).toBeGreaterThan(0);
        expect(result.limit).toBe(5); // auth limit from config
    });

    it('should block requests over limit', async () => {
        // Reset Redis mock first
        jest.resetModules();
        jest.clearAllMocks();
        
        // Mock Redis to return count above the auth limit (which is 5)
        console.log('Setting up mock with over-limit count');
        const mockPipeline = {
            incr: jest.fn(),
            pexpire: jest.fn(),
            exec: jest.fn(() => {
                console.log('Pipeline exec called');
                return Promise.resolve([6]);  // Should trigger rate limit
            })
        };
        console.log('Created pipeline mock:', mockPipeline);

        const mockRedisInstance = {
            pipeline: jest.fn(() => {
                console.log('Pipeline called, returning:', mockPipeline);
                return mockPipeline;
            }),
            pexpire: jest.fn().mockResolvedValue(true)
        };
        console.log('Created Redis instance:', mockRedisInstance);

        // Reset the Redis mock implementation
        jest.mock('@upstash/redis', () => ({
            Redis: jest.fn(() => mockRedisInstance)
        }), { virtual: true });

        // Re-import the rateLimit function to use new mock
        const { rateLimit: rateLimitFn } = await import('./rateLimiter');
        
        console.log('Calling rateLimit');
        const result = await rateLimitFn(mockRequest, 'auth');
        console.log('Rate limit result:', result);
        
        // Add debug logs for pipeline execution
        console.log('Pipeline exec calls:', mockPipeline.exec.mock.calls.length);
        console.log('Pipeline exec results:', mockPipeline.exec.mock.results);
        
        // Verify the mock was actually used
        expect(mockRedisInstance.pipeline).toHaveBeenCalled();
        expect(mockPipeline.exec).toHaveBeenCalled();
        expect(result.success).toBe(false);
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
        // Mock time
        jest.useFakeTimers();
        const now = Date.now();
        
        // First request
        const result1 = await rateLimit(mockRequest, 'auth');
        
        // Advance time past window
        jest.setSystemTime(now + 61000); // 61 seconds later
        
        // Next request should have full limit
        const result2 = await rateLimit(mockRequest, 'auth');
        
        expect(result2.remaining).toBe(result2.limit - 1);
        
        jest.useRealTimers();
    });

    it('should handle Redis errors gracefully', async () => {
        MockRedis.mockImplementationOnce(() => ({
            pipeline: jest.fn(() => {
                throw new Error('Redis connection error');
            })
        }));

        const result = await rateLimit(mockRequest, 'auth');
        expect(result.success).toBe(true);
    });
}); 