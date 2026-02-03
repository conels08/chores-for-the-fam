import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Creates a Supabase client for use in Server Actions / Route Handlers.
 *
 * By default, this uses Next.js' `cookies()`.
 *
 * Note: this will throw until you configure env vars.
 */
export function createSupabaseServerClient(cookieStore: ReturnType<typeof cookies> = cookies()) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
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
  });
}

// Backwards-compatible alias for older route handlers.
export function createClient(cookieStore: ReturnType<typeof cookies> = cookies()) {
  return createSupabaseServerClient(cookieStore);
}
