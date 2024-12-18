import { createBrowserClient } from "@supabase/ssr";

// Create a singleton instance
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Export both the instance and the creation function
export { supabase };
export const createClient = () => supabase;
