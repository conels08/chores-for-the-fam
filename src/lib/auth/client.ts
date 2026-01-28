'use client';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern with globalThis to handle HMR and prevent multiple instances
declare global {
  var __supabase__: SupabaseClient | undefined;
}

// Dev-only logging helper (opt-in via NEXT_PUBLIC_DEV_AUTH_LOG)
const devLog = (...args: unknown[]) => {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_AUTH_LOG === 'true'
  ) {
    console.log('[Supabase Auth]', ...args);
  }
};

// Create or retrieve cached client instance
const getSupabaseClient = (): SupabaseClient => {
  if (typeof window !== 'undefined') {
    // Client-side: check globalThis cache
    if (!globalThis.__supabase__) {
      devLog('🔧 Creating new browser Supabase client (singleton)');
      globalThis.__supabase__ = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } else {
      devLog('✅ Reusing existing browser Supabase client');
    }
    return globalThis.__supabase__;
  }
  // Server-side or SSR: create new instance
  devLog('🖥️  Creating server Supabase client');
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = getSupabaseClient();

// Export dev-only logger for UserContext
export { devLog as devOnlyAuthLog };
