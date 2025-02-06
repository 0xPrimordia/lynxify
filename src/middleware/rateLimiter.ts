import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/utils/rateLimiter';

export async function rateLimiterMiddleware(
    request: NextRequest,
    type: 'auth' | 'wallet' | 'reset' | 'create' | 'backup' | 'sign'
) {
    try {
        const result = await rateLimit(request, type);
        const headers = new Headers();
        
        // Always add rate limit headers
        headers.set('X-RateLimit-Limit', result.limit.toString());
        headers.set('X-RateLimit-Remaining', result.remaining.toString());
        headers.set('X-RateLimit-Reset', result.reset.toString());
        
        if (!result.success) {
            const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
            headers.set('Retry-After', retryAfter.toString());
            
            return NextResponse.json(
                { error: 'Too many requests', retryAfter, type },
                { status: 429, headers }
            );
        }

        const response = NextResponse.next();
        headers.forEach((value, key) => {
            response.headers.set(key, value);
        });
        
        return response;
    } catch (error) {
        console.error('Rate limiting error:', error);
        return NextResponse.next();
    }
} 