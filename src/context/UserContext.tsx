'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, devOnlyAuthLog } from '@/lib/auth/client';
import type { User } from '@supabase/supabase-js';
import type { AppUser } from '@/lib/database/types';
import { getProfileWithFamily, toAppUser } from '@/lib/database/profiles';

type UserContextType = {
  authUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state and prevent race conditions
  const mountedRef = useRef(true);
  const loadingProfileRef = useRef<Promise<void> | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const loadUserProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setAuthUser(null);
      setAppUser(null);
      return;
    }

    // Avoid concurrent profile loads for the same user
    if (loadingProfileRef.current) {
      await loadingProfileRef.current;
      if (authUser?.id === user.id) {
        devOnlyAuthLog('⏭️  Profile already loaded for user:', user.id);
        return; // Profile already loaded for this user
      }
    }

    devOnlyAuthLog('📥 Loading profile for user:', user.id);

    const loadPromise = (async () => {
      try {
        const profileWithFamily = await getProfileWithFamily(user.id);

        if (!mountedRef.current) return;

        if (profileWithFamily) {
          setAppUser(toAppUser(profileWithFamily));
          devOnlyAuthLog('✅ Profile loaded successfully');
        } else {
          // Profile does not exist - edge case
          setError(
            'Your profile was not found. Please contact an administrator.'
          );
          devOnlyAuthLog('❌ Profile not found');
        }
      } catch (err) {
        // Silently ignore AbortError (expected on unmount/navigation)
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          devOnlyAuthLog('⚠️  Profile load aborted (expected on navigation)');
          return;
        }
        console.error('Error loading profile:', err);
        if (mountedRef.current) {
          setError('Failed to load your profile. Please try again.');
        }
      }
    })();

    loadingProfileRef.current = loadPromise;
    await loadPromise;
    loadingProfileRef.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (authUser) {
      devOnlyAuthLog('🔄 Refreshing profile');
      await loadUserProfile(authUser);
    }
  }, [authUser, loadUserProfile]);

  useEffect(() => {
    mountedRef.current = true;

    let initialized = false;

    const initializeAuth = async () => {
      // Prevent duplicate initialization
      if (initialized) {
        devOnlyAuthLog('⚠️  Auth already initialized, skipping');
        return;
      }
      initialized = true;

      devOnlyAuthLog('🚀 Initializing auth...');

      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        setAuthUser(session?.user || null);

        if (session?.user) {
          devOnlyAuthLog('✅ Initial session found for user:', session.user.id);
          await loadUserProfile(session.user);
        } else {
          devOnlyAuthLog('ℹ️  No active session');
        }
      } catch (err) {
        // Silently ignore AbortError (expected on unmount/navigation)
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          devOnlyAuthLog('⚠️  Auth initialization aborted (expected on navigation)');
          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }
        console.error('Auth initialization error:', err);
        if (mountedRef.current) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    devOnlyAuthLog('📡 Attaching onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      devOnlyAuthLog('🔄 Auth state changed:', event, session?.user?.id || '(no user)');

      if (!mountedRef.current) return;

      setAuthUser(session?.user || null);
      setError(null);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAppUser(null);
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      devOnlyAuthLog('🔌 Detaching onAuthStateChange listener');
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [loadUserProfile, mountedRef]);

  return (
    <UserContext.Provider value={{ authUser, appUser, loading, error, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
