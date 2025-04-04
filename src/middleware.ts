import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabase } from '@/utils/supabase'
import { cookies } from 'next/headers'
import { rateLimiterMiddleware, getRateLimitType } from './middleware/rateLimiter'

// Define protected routes that require session validation
const PROTECTED_ROUTES = [
  '/api/wallet/',      // All wallet endpoints
  '/api/thresholds/',  // All threshold endpoints
  '/api/user/'         // All user endpoints
]

export async function middleware(request: NextRequest) {
  // First check if route needs rate limiting
  const rateLimitType = getRateLimitType(request.nextUrl.pathname);
  if (rateLimitType) {
    const rateLimitResult = await rateLimiterMiddleware(request, rateLimitType);
    // If rate limit was exceeded, return the error response
    if (rateLimitResult.status === 429 || rateLimitResult.status === 503) {
      return rateLimitResult;
    }
  }

  // Then proceed with session validation for protected routes
  if (!PROTECTED_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  try {
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Decode JWT to get user info (no verification needed as Supabase already verified it)
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = decoded.sub; // Supabase stores user ID in the 'sub' claim
      
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', userId)
      requestHeaders.set('x-user-email', decoded.email || '')
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    // Fall back to cookie-based auth
    const cookieStore = cookies()
    const supabase = createServerSupabase(cookieStore, true)
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      console.error('Session validation failed:', error || 'No session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', session.user.id)
    requestHeaders.set('x-user-email', session.user.email || '')

    // Clone the request with new headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// Configure middleware matching
export const config = {
  matcher: [
    // Match all API routes that need rate limiting
    '/api/auth/:path*',
    '/api/wallet/:path*',
    '/api/thresholds/:path*',
    '/api/user/:path*',
    
    // Exclude static files and other non-API routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 