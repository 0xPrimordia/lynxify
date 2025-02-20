import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    blocked?: boolean;
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

const redis = isDevelopment ? null : new Redis({
    url: `https://${process.env.UPSTASH_REDIS_REST_URL}`,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

interface RateLimitConfig {
    maxRequests: number;  // Maximum requests allowed
    windowMs: number;     // Time window in milliseconds
    blockDuration?: number;
    increaseFactor?: number;  // For progressive delays
}

interface RateLimitKey {
    ip: string;
    userId?: string;
    sessionId?: string;
    type: string;
}

const RATE_LIMIT_CONFIGS: { [key: string]: RateLimitConfig } = {
    'auth': { 
        maxRequests: 5, 
        windowMs: 60 * 1000,
        blockDuration: 15 * 60 * 1000,  // 15 minutes
        increaseFactor: 2  // Double the block duration on repeated violations
    },
    'wallet': { 
        maxRequests: 10, 
        windowMs: 60 * 1000,
        blockDuration: 30 * 60 * 1000,  // 30 minutes
        increaseFactor: 3
    },
    'reset': { maxRequests: 3, windowMs: 60 * 60 * 1000 },   // 3 requests per hour
    'create': { maxRequests: 2, windowMs: 60 * 60 * 1000 },  // 2 account creations per hour
    'backup': { maxRequests: 5, windowMs: 60 * 1000 },       // 5 backup attempts per minute
    'sign': { maxRequests: 20, windowMs: 60 * 1000 }         // 20 signing requests per minute
};

// Create a type for our mock Redis
type MockRedis = {
    incr: () => Promise<number>;
    expire: () => Promise<boolean>;
    pexpire: () => Promise<boolean>;
    get: () => Promise<null>;
    keys: () => Promise<string[]>;
    del: (...keys: string[]) => Promise<number>;
    pipeline: () => {
        incr: () => MockRedis;
        pexpire: () => MockRedis;
        exec: () => Promise<[null, number][]>;
    };
};

// Add pipeline support to mock with proper typing
const mockRedis: MockRedis = {
    incr: async () => 1,
    expire: async () => true,
    pexpire: async () => true,
    get: async () => null,
    keys: async () => [] as string[],
    del: async (...keys: string[]) => 1,
    pipeline: () => ({
        incr: () => mockRedis,
        pexpire: () => mockRedis,
        exec: async () => [[null, 1]]
    })
};

// Export the Redis instance or mock based on environment with proper typing
export const getRedisInstance = () => isDevelopment ? mockRedis : (redis || mockRedis);

async function checkBlockedStatus(redis: Redis, blockKeys: string[]): Promise<{ isBlocked: boolean; reset?: number }> {
    const pipeline = redis.pipeline();
    blockKeys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    for (const result of results) {
        if (result && typeof result === 'string') {
            const blockData = JSON.parse(result);
            if (blockData.until > Date.now()) {
                return { isBlocked: true, reset: blockData.until };
            }
        }
    }
    return { isBlocked: false };
}

async function updateRateLimits(redis: Redis, keys: Record<string, string | null>, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const pipeline = redis.pipeline();
    const windowKey = `window:${now}`;
    
    // Add requests to each level's window
    Object.values(keys).filter(Boolean).forEach(key => {
        pipeline.incr(`${key}:${windowKey}`);
        pipeline.pexpire(`${key}:${windowKey}`, config.windowMs);
    });
    
    const results = await pipeline.exec() as [Error | null, number][];
    const maxCount = Math.max(...results.map(([err, val]) => (err ? 0 : val) || 0));
    
    if (maxCount > config.maxRequests) {
        // Calculate progressive block duration
        const blockDuration = config.blockDuration || config.windowMs;
        const previousBlocks = await getPreviousBlockCount(redis, keys);
        const increaseFactor = config.increaseFactor || 1;
        const actualBlockDuration = blockDuration * Math.pow(increaseFactor, previousBlocks);
        
        // Apply blocks
        await applyRateLimit(redis, keys, actualBlockDuration);
        
        return {
            success: false,
            limit: config.maxRequests,
            remaining: 0,
            reset: now + actualBlockDuration,
            blocked: true
        };
    }
    
    return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - maxCount,
        reset: now + config.windowMs
    };
}

async function getPreviousBlockCount(redis: Redis, keys: Record<string, string | null>): Promise<number> {
    const pipeline = redis.pipeline();
    Object.values(keys).filter(Boolean).forEach(key => {
        pipeline.get(`${key}:blockCount`);
    });
    const results = await pipeline.exec() as [Error | null, string | null][];
    return Math.max(...results.map(([err, count]) => parseInt(err ? '0' : count || '0', 10)));
}

async function applyRateLimit(redis: Redis, keys: Record<string, string | null>, duration: number): Promise<void> {
    const pipeline = redis.pipeline();
    const blockData = JSON.stringify({
        until: Date.now() + duration,
        reason: 'Rate limit exceeded'
    });
    
    Object.values(keys).filter(Boolean).forEach(key => {
        // Use setex instead of set with PX option for better type compatibility
        pipeline.setex(`${key}:blocked`, Math.ceil(duration / 1000), blockData);
        pipeline.incr(`${key}:blockCount`);
        pipeline.expire(`${key}:blockCount`, 24 * 60 * 60);
    });
    
    await pipeline.exec();
}

export async function rateLimit(request: NextRequest, type: keyof typeof RATE_LIMIT_CONFIGS): Promise<RateLimitResult> {
    const redisInstance = getRedisInstance() as Redis;
    const config = RATE_LIMIT_CONFIGS[type];
    
    // Extract identifiers (from previous implementation)
    const keys = {
        ip: `ratelimit:${type}:ip:${request.ip}`,
        session: request.cookies.get('session')?.value 
            ? `ratelimit:${type}:session:${request.cookies.get('session')?.value}`
            : null,
        user: request.headers.get('x-user-id') 
            ? `ratelimit:${type}:user:${request.headers.get('x-user-id')}`
            : null
    };

    // Check blocked status
    const blockedStatus = await checkBlockedStatus(
        redisInstance,
        Object.values(keys).filter((key): key is string => key !== null)
    );
    if (blockedStatus.isBlocked) {
        return {
            success: false,
            limit: config.maxRequests,
            remaining: 0,
            reset: blockedStatus.reset!,
            blocked: true
        };
    }

    // Update and check rate limits
    return updateRateLimits(redisInstance, keys, config);
}

export const rateLimitAttempt = async (key: string, maxAttempts = 5) => {
    const attempts = await getRedisInstance().incr(key);
    if (attempts === 1) {
        await getRedisInstance().expire(key, 60); // Reset after 60 seconds
    }
    return attempts <= maxAttempts;
}

export async function resetRateLimits(ip: string) {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Rate limit reset only available in test environment');
    }
    
    const keys = await getRedisInstance().keys(`rate-limit:*:${ip}`);
    if (keys.length > 0) {
        await getRedisInstance().del(...keys);
    }
    return true;
} 