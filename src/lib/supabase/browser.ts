import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Creates a Supabase client for use in the browser (Client Components).
 *
 * Note: this will throw until you configure env vars.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey);
}
