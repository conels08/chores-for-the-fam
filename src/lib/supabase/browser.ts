/**
 * Re-exports the canonical browser Supabase client singleton.
 *
 * All browser-side code should import from this module to ensure
 * only ONE Supabase client instance exists at runtime.
 *
 * The singleton is defined in src/lib/auth/client.ts with globalThis caching
 * to prevent multiple instances during HMR.
 */
export { supabase as createSupabaseBrowserClient } from '@/lib/auth/client';
export { supabase } from '@/lib/auth/client';
