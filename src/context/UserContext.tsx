'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from "next/navigation";
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
  isProfileReady: boolean;
  authReady: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const BASE_PROFILE_TIMEOUT_MS = 4000;
  const REHYDRATION_GRACE_MS = 1000;

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms)
      ),
    ]);
  };

  // Track mounted state and prevent race conditions
  const mountedRef = useRef(true);
  const loadingProfileRef = useRef<Promise<void> | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const profileRequestIdRef = useRef(0);
  const pathnameRef = useRef<string | null>(null);
  const redirectedForSessionLossRef = useRef(false);
  const authReadyRef = useRef(false);
  const hadSessionRef = useRef(false);
  const lastVisibleAtRef = useRef<number>(Date.now());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      lastVisibleAtRef.current = Date.now();
      devOnlyAuthLog('👀 Tab visible: starting rehydration grace window');
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastVisibleAtRef.current = Date.now();
        devOnlyAuthLog('👀 Tab visible: starting rehydration grace window');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const getProfileTimeoutMs = () => {
    if (typeof document === 'undefined') return BASE_PROFILE_TIMEOUT_MS;
    if (document.visibilityState !== 'visible') return BASE_PROFILE_TIMEOUT_MS;
    const elapsed = Date.now() - lastVisibleAtRef.current;
    if (elapsed < REHYDRATION_GRACE_MS) {
      return BASE_PROFILE_TIMEOUT_MS + (REHYDRATION_GRACE_MS - elapsed);
    }
    return BASE_PROFILE_TIMEOUT_MS;
  };

  const getRehydrationDelayMs = () => {
    if (typeof document === 'undefined') return 0;
    if (document.visibilityState !== 'visible') return 0;
    const elapsed = Date.now() - lastVisibleAtRef.current;
    if (elapsed < REHYDRATION_GRACE_MS) {
      return REHYDRATION_GRACE_MS - elapsed;
    }
    return 0;
  };

  const isInRehydrationGraceWindow = () => {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState !== 'visible') return false;
    return Date.now() - lastVisibleAtRef.current < REHYDRATION_GRACE_MS;
  };

  const shouldCommitProfileError = () => {
    if (!authReadyRef.current) return false;
    if (isInRehydrationGraceWindow()) return false;
    return true;
  };

  const loadUserProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setAuthUser(null);
      setAppUser(null);
      profileRequestIdRef.current += 1;
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

    const requestId = (profileRequestIdRef.current += 1);
    const loadPromise = (async () => {
      try {
        const profileWithFamily = await getProfileWithFamily(user.id);

        if (!mountedRef.current) return;
        if (requestId !== profileRequestIdRef.current) return;

        if (profileWithFamily) {
          setAppUser(toAppUser(profileWithFamily));
          setError(null);
          devOnlyAuthLog('✅ Profile loaded successfully');
        } else {
          // Profile does not exist - edge case
          if (requestId === profileRequestIdRef.current) {
            setError(
              'Your profile was not found. Please contact an administrator.'
            );
            devOnlyAuthLog('❌ Profile not found');
          }
        }
      } catch (err) {
        // Silently ignore AbortError (expected on unmount/navigation)
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          devOnlyAuthLog('⚠️  Profile load aborted (expected on navigation)');
          return;
        }
        console.error('Error loading profile:', err);
        if (mountedRef.current && requestId === profileRequestIdRef.current) {
          if (!shouldCommitProfileError()) {
            devOnlyAuthLog('⏳ Skipping profile error during rehydration grace window');
            return;
          }
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
      setError(null);
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
          hadSessionRef.current = true;
          redirectedForSessionLossRef.current = false;
        }

        if (session?.user) {
          devOnlyAuthLog('✅ Initial session found for user:', session.user.id);
          try {
            const delayMs = getRehydrationDelayMs();
            if (delayMs > 0) {
              devOnlyAuthLog('⏳ Rehydration grace: delaying profile load by', delayMs, 'ms');
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            const timeoutMs = getProfileTimeoutMs();
            if (timeoutMs > BASE_PROFILE_TIMEOUT_MS) {
              devOnlyAuthLog('⏳ Rehydration grace: extending profile timeout to', timeoutMs, 'ms');
            }
            await withTimeout(loadUserProfile(session.user), timeoutMs, "LOAD_PROFILE");
          } catch (err) {
            console.error("[UserContext] loadUserProfile failed/hung:", err);
            if (!shouldCommitProfileError()) {
              devOnlyAuthLog('⏳ Skipping timeout error during rehydration grace window');
              return;
            }
            profileRequestIdRef.current += 1;
            setAppUser(null);
            setError("Session sync timed out. Please try again.");
            setLoading(false);
            return;
          }
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
          setAuthReady(true);
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
        hadSessionRef.current = true;
        redirectedForSessionLossRef.current = false;
        try {
          const delayMs = getRehydrationDelayMs();
          if (delayMs > 0) {
            devOnlyAuthLog('⏳ Rehydration grace: delaying profile load by', delayMs, 'ms');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          const timeoutMs = getProfileTimeoutMs();
          if (timeoutMs > BASE_PROFILE_TIMEOUT_MS) {
            devOnlyAuthLog('⏳ Rehydration grace: extending profile timeout to', timeoutMs, 'ms');
          }
          await withTimeout(loadUserProfile(session.user), timeoutMs, "LOAD_PROFILE");
        } catch (err) {
          console.error("[UserContext] loadUserProfile failed/hung:", err);
          if (!shouldCommitProfileError()) {
            devOnlyAuthLog('⏳ Skipping timeout error during rehydration grace window');
            return;
          }
          profileRequestIdRef.current += 1;
          setAppUser(null);
          setError("Session sync timed out. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        setAppUser(null);
        // If we lose session while in the authenticated app area, force navigation to login.
        // This prevents the UI from getting stuck in a half-authenticated loading state.
        if (
          authReadyRef.current &&
          hadSessionRef.current &&
          !session?.user &&
          !redirectedForSessionLossRef.current &&
          event !== 'INITIAL_SESSION' &&
          pathnameRef.current?.startsWith('/app')
        ) {
          redirectedForSessionLossRef.current = true;
          router.replace('/login');
        }
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
    <UserContext.Provider
      value={{
        authUser,
        appUser,
        loading,
        error,
        refreshProfile,
        isProfileReady: !!appUser && !loading && !error,
        authReady
      }}
    >
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
