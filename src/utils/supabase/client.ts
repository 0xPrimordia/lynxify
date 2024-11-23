import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  // Temporary debugging
  console.log('Environment check:', {
    hasUrl: typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string',
    urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string',
  });

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
