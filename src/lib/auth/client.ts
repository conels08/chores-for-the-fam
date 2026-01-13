'use client';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern with globalThis to handle HMR and prevent multiple instances
declare global {
  var __supabase__: SupabaseClient | undefined;
}

// Create or retrieve cached client instance
const getSupabaseClient = (): SupabaseClient => {
  if (typeof window !== 'undefined') {
    // Client-side: check globalThis cache
    if (!globalThis.__supabase__) {
      globalThis.__supabase__ = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return globalThis.__supabase__;
  }
  // Server-side or SSR: create new instance
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = getSupabaseClient();