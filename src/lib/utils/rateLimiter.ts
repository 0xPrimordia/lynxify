import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { 
    RateLimitResult, 
    RateLimitType, 
    RateLimitConfig, 
    RateLimitKey,
    RATE_LIMIT_CONFIGS 
} from '@/app/types';

const redis = new Redis({
    url: `https://${process.env.UPSTASH_REDIS_REST_URL!}`,
    token: process.env.UPSTASH_REDIS_PASSWORD!
});

export const getRedisInstance = () => redis;

async function checkBlockedStatus(redis: Redis, blockKeys: string[]): Promise<{ isBlocked: boolean; reset?: number }> {
    try {
        if (!blockKeys.length) return { isBlocked: false };
        
        console.log('Checking block status for keys:', blockKeys);
        const multi = redis.multi();
        for (const key of blockKeys) {
            multi.get(key);
        }
        
        const results = await multi.exec();
        console.log('Multi results:', results);
        
        // Upstash returns a flat array of results
        if (!Array.isArray(results)) {
            console.error('Expected array result, got:', typeof results);
            return { isBlocked: false };
        }

        for (const result of results) {
            if (!result) continue;
            try {
                const blockData = JSON.parse(result as string);
                if (blockData?.until > Date.now()) {
                    return { isBlocked: true, reset: blockData.until };
                }
            } catch (e) {
                console.error('Failed to parse block data:', result, e);
            }
        }
        return { isBlocked: false };
    } catch (error) {
        console.error('checkBlockedStatus error:', error);
        return { isBlocked: false };
    }
}

async function updateRateLimits(redis: Redis, keys: Record<string, string | null>, config: RateLimitConfig): Promise<RateLimitResult> {
    try {
        const { maxRequests, windowMs } = config;
        const now = Date.now();
        const windowKey = `window:${Math.floor(now / windowMs)}`;
        
        console.log('Keys for rate limit:', keys);
        
        const validKeys = Object.values(keys).filter(Boolean) as string[];
        console.log('Valid keys for pipeline:', validKeys);
        
        const pipeline = redis.pipeline();
        validKeys.forEach(key => {
            const windowedKey = `${key}:${windowKey}`;
            console.log('Adding pipeline operations for key:', windowedKey);
            pipeline.incr(windowedKey);
            pipeline.pexpire(windowedKey, windowMs);
        });
        
        // Add operation to get block count
        pipeline.get(`${validKeys[0]}:block`);
        pipeline.expire(`${validKeys[0]}:block`, windowMs);
        
        const results = await pipeline.exec();
        console.log('Pipeline execution results:', results);
        
        if (!Array.isArray(results)) {
            console.error('Expected array result, got:', typeof results);
            return {
                blocked: false,
                limit: maxRequests,
                remaining: maxRequests,
                reset: now + windowMs
            };
        }
        
        // Filter out the results to get just the counts (every other result is from pexpire)
        const counts = results
            .filter((_, i) => i % 2 === 0) // Get only the incr results
            .map(result => {
                if (Array.isArray(result)) {
                    const [err, value] = result;
                    if (err) {
                        console.error('Redis error:', err);
                        return 0;
                    }
                    return typeof value === 'number' ? value : parseInt(value as string) || 0;
                }
                return 0;
            });
        
        console.log('Filtered counts:', counts);
        
        const maxCount = Math.max(...counts);
        console.log('Max count:', maxCount);
        
        return {
            blocked: maxCount > maxRequests,
            limit: maxRequests,
            remaining: Math.max(0, maxRequests - maxCount),
            reset: now + windowMs
        };
    } catch (error) {
        console.error('updateRateLimits error:', error);
        return {
            blocked: false,
            limit: config.maxRequests,
            remaining: config.maxRequests,
            reset: Date.now() + config.windowMs
        };
    }
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
        pipeline.setex(`${key}:blocked`, Math.ceil(duration / 1000), blockData);
        pipeline.incr(`${key}:blockCount`);
        pipeline.expire(`${key}:blockCount`, 24 * 60 * 60);
    });
    
    await pipeline.exec();
}

export async function rateLimit(request: NextRequest, type: keyof typeof RATE_LIMIT_CONFIGS): Promise<RateLimitResult> {
    const config = RATE_LIMIT_CONFIGS[type];
    
    const keys = {
        ip: `ratelimit:${type}:ip:${request.ip || request.headers.get('x-forwarded-for') || 'unknown'}`,
        session: request.cookies.get('session')?.value 
            ? `ratelimit:${type}:session:${request.cookies.get('session')?.value}`
            : null,
        user: request.headers.get('x-user-id') 
            ? `ratelimit:${type}:user:${request.headers.get('x-user-id')}`
            : null
    };

    const blockedStatus = await checkBlockedStatus(
        redis,
        Object.values(keys).filter((key): key is string => key !== null)
    );

    if (blockedStatus.isBlocked) {
        return {
            blocked: true,
            limit: config.maxRequests,
            remaining: 0,
            reset: blockedStatus.reset!
        };
    }

    return updateRateLimits(redis, keys, config);
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