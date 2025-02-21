import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/utils/rateLimiter';
import { SecurityMonitor } from '@/lib/monitoring/security';
import { getRedisInstance } from '@/lib/utils/rateLimiter';
import { Redis } from '@upstash/redis';

export async function rateLimiterMiddleware(
    request: NextRequest,
    type: 'auth' | 'wallet' | 'reset' | 'create' | 'backup' | 'sign'
) {
    const redis = getRedisInstance();
    const monitor = new SecurityMonitor(redis as Redis);

    try {
        const result = await rateLimit(request, type);
        const headers = new Headers();
        
        // Standard rate limit headers
        headers.set('X-RateLimit-Limit', result.limit.toString());
        headers.set('X-RateLimit-Remaining', result.remaining.toString());
        headers.set('X-RateLimit-Reset', result.reset.toString());
        
        if (result.blocked) {
            const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
            headers.set('Retry-After', retryAfter.toString());
            
            try {
                await monitor.logEvent(request, {
                    type: 'rate_limit',
                    userId: request.headers.get('x-user-id') || undefined,
                    details: {
                        limitType: type,
                        remaining: result.remaining,
                        reset: result.reset
                    }
                });
            } catch (error) {
                console.error('Rate limit monitoring error:', error);
                // Continue with response even if monitoring fails
            }

            return NextResponse.json(
                { 
                    error: 'Too many requests',
                    retryAfter,
                    type,
                    details: `Rate limit exceeded for ${type} operations`
                },
                { 
                    status: 429, 
                    headers,
                    statusText: 'Too Many Requests'
                }
            );
        }

        // If request is allowed, add headers to response
        const response = NextResponse.next();
        headers.forEach((value, key) => {
            response.headers.set(key, value);
        });

        // Add request tracking headers
        response.headers.set('X-Request-ID', crypto.randomUUID());
        response.headers.set('X-RateLimit-Type', type);
        
        return response;
    } catch (error: any) {
        await monitor.logEvent(request, {
            type: 'rate_limit',
            details: {
                error: error.message,
                type: 'system_error'
            }
        });
        
        console.error('Rate limiting error:', error);
        
        // Fail closed: if rate limiting fails, block the request
        return NextResponse.json(
            { 
                error: 'Service temporarily unavailable',
                details: 'Rate limiting service error'
            },
            { 
                status: 503,
                headers: {
                    'Retry-After': '60'
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