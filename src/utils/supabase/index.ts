import { createClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';

// Single browser client instance - safe for client components
export const browserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Export a default client for browser usage
export const supabase = browserClient;

// Server-side client creator - only use in server components/actions
export const createServerSupabase = (cookieStore: any, useServiceRole: boolean = false) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    useServiceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: {
          getItem: (key: string) => cookieStore.get(key)?.value,
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value, { 
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
              sameSite: 'lax'
            });
          },
          removeItem: (key: string) => {
            cookieStore.set(key, '', { 
              path: '/',
              maxAge: 0,
              sameSite: 'lax'
            });
          }
        }
      }
    }
  );
}; 