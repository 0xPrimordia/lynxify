import { createBrowserClient } from "@supabase/ssr";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";

/**
 * CLIENT-SIDE SINGLETON
 * Use for client-side components only
 * Uses anon key for public operations
 * Maintains client-side session state
 */
export const browserClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * SERVER-SIDE SESSION CLIENT
 * Use for API routes that need user session
 * Uses anon key with cookie handling
 * @example
 * // In API route:
 * const supabase = await createServerSessionClient();
 * const { data: { user } } = await supabase.auth.getUser();
 */
export const createServerSessionClient = async () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

/**
 * SERVICE ROLE CLIENT
 * Use for admin operations only (user creation, forced auth)
 * Uses service role key - BE CAREFUL!
 * @example
 * // In wallet-connect route:
 * const adminClient = createServiceRoleClient();
 * await adminClient.auth.admin.createUser({ ... });
 */
export const createServiceRoleClient = (options = {}) => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      ...options
    }
  );
};

// Maintain backward compatibility
/** @deprecated Use specific client types instead */
export const createClient = createServerSessionClient;

// Export direct client creation for special cases
/** @deprecated Use specific client types unless absolutely necessary */
export { createSupabaseClient as createDirectClient }; 