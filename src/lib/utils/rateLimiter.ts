import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = new Redis({
    url: `https://${process.env.UPSTASH_REDIS_REST_URL}`,
    token: process.env.UPSTASH_REDIS_PASSWORD
});

interface RateLimitConfig {
    maxRequests: number;  // Maximum requests allowed
    windowMs: number;     // Time window in milliseconds
}

const RATE_LIMIT_CONFIGS: { [key: string]: RateLimitConfig } = {
    'auth': { maxRequests: 5, windowMs: 60 * 1000 },         // 5 requests per minute
    'wallet': { maxRequests: 10, windowMs: 60 * 1000 },      // 10 requests per minute
    'reset': { maxRequests: 3, windowMs: 60 * 60 * 1000 },   // 3 requests per hour
    'create': { maxRequests: 2, windowMs: 60 * 60 * 1000 },  // 2 account creations per hour
    'backup': { maxRequests: 5, windowMs: 60 * 1000 },       // 5 backup attempts per minute
    'sign': { maxRequests: 20, windowMs: 60 * 1000 }         // 20 signing requests per minute
};

export async function rateLimit(
    req: NextRequest,
    type: keyof typeof RATE_LIMIT_CONFIGS
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const ip = req.ip || 'anonymous';
    const config = RATE_LIMIT_CONFIGS[type];
    
    if (!config) {
        throw new Error(`Unknown rate limit type: ${type}`);
    }

    const key = `rate-limit:${type}:${ip}`;
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, config.windowMs);
    
    const [count] = (await pipeline.exec()) as [number];
    
    // First request in window
    if (count === 1) {
        await redis.pexpire(key, config.windowMs);
    }

    return {
        success: count <= config.maxRequests,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        reset: windowStart + config.windowMs,
    };
}

export const rateLimitAttempt = async (key: string, maxAttempts = 5) => {
    const attempts = await redis.incr(key);
    if (attempts === 1) {
        await redis.expire(key, 60); // Reset after 60 seconds
    }
    return attempts <= maxAttempts;
} 