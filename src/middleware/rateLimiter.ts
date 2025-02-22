import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/utils/rateLimiter';
import { SecurityMonitor } from '@/lib/monitoring/security';
import { getRedisInstance } from '@/lib/utils/rateLimiter';
import { Redis } from '@upstash/redis';
import type { RateLimitResult, RateLimitType, RateLimitError } from '@/app/types';

export async function rateLimiterMiddleware(
    request: NextRequest,
    type: RateLimitType
) {
    const requestId = crypto.randomUUID();
    console.log(`[RateLimit:${requestId}] Starting rate limit check for ${type}`, {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: request.headers.get('x-user-id')
    });

    try {
        const redis = getRedisInstance();
        const monitor = new SecurityMonitor(redis as Redis);

        const result = await rateLimit(request, type);
        const headers = new Headers();
        
        // Standard rate limit headers
        headers.set('X-RateLimit-Limit', result.limit.toString());
        headers.set('X-RateLimit-Remaining', result.remaining.toString());
        headers.set('X-RateLimit-Reset', result.reset.toString());
        headers.set('X-Request-ID', requestId);
        
        if (result.blocked) {
            console.log(`[RateLimit:${requestId}] Request blocked`, {
                type,
                remaining: result.remaining,
                reset: result.reset
            });

            const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
            headers.set('Retry-After', retryAfter.toString());
            
            try {
                await monitor.logEvent(request, {
                    type: 'rate_limit',
                    userId: request.headers.get('x-user-id') || undefined,
                    details: {
                        limitType: type,
                        remaining: result.remaining,
                        reset: result.reset,
                        requestId
                    }
                });
            } catch (error) {
                console.error(`[RateLimit:${requestId}] Monitoring error:`, error);
            }

            return NextResponse.json(
                { 
                    error: 'Too many requests',
                    retryAfter,
                    type,
                    details: `Rate limit exceeded for ${type} operations`,
                    requestId
                },
                { 
                    status: 429, 
                    headers,
                    statusText: 'Too Many Requests'
                }
            );
        }

        console.log(`[RateLimit:${requestId}] Request allowed`, {
            type,
            remaining: result.remaining
        });

        const response = NextResponse.next();
        headers.forEach((value, key) => {
            response.headers.set(key, value);
        });
        
        return response;
    } catch (error) {
        const errorDetails: RateLimitError = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'RATE_LIMIT_ERROR',
            details: {
                type,
                requestId,
                timestamp: new Date().toISOString()
            }
        };

        console.error(`[RateLimit:${requestId}] Error:`, errorDetails);
        
        return NextResponse.json(
            { 
                error: 'Service temporarily unavailable',
                details: errorDetails
            },
            { 
                status: 503,
                headers: {
                    'Retry-After': '60',
                    'X-Request-ID': requestId
                }
            }
        );
    }
}

// Helper to match routes to rate limit types
export function getRateLimitType(pathname: string): 'auth' | 'wallet' | 'reset' | 'create' | 'backup' | 'sign' | null {
    const routes = {
        '/api/auth': 'auth',
        '/api/wallet/create': 'create',
        '/api/wallet/backup': 'backup',
        '/api/wallet/reset': 'reset',
        '/api/wallet/sign': 'sign',
        '/api/wallet': 'wallet'
    } as const;

    return Object.entries(routes).find(([route]) => pathname.startsWith(route))?.[1] ?? null;
} 