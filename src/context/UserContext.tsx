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
  profileStatus: 'idle' | 'loading' | 'rehydrating' | 'ready' | 'error';
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
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'rehydrating' | 'ready' | 'error'>('idle');
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const BASE_PROFILE_TIMEOUT_MS = 4000;
  const REHYDRATION_GRACE_MS = 1000;

  // Track mounted state and prevent race conditions
  const mountedRef = useRef(true);
  const inFlightProfilePromiseRef = useRef<Promise<void> | null>(null);
  const inFlightProfileRequestIdRef = useRef<number | null>(null);
  const inFlightProfileUserIdRef = useRef<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const profileRequestIdRef = useRef(0);
  const pathnameRef = useRef<string | null>(null);
  const redirectedForSessionLossRef = useRef(false);
  const authReadyRef = useRef(false);
  const authUserRef = useRef<User | null>(null);
  const hadSessionRef = useRef(false);
  const lastVisibleAtRef = useRef<number>(Date.now());
  const rehydrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rehydratingRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

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
      setError(null);
      setProfileStatus('idle');
      setLoading(false);
      profileRequestIdRef.current += 1;
      return;
    }

    if (inFlightProfilePromiseRef.current) {
      if (inFlightProfileUserIdRef.current !== user.id) {
        devOnlyAuthLog('⏳ Waiting for in-flight profile request (different user)', {
          requestId: inFlightProfileRequestIdRef.current,
          inFlightUserId: inFlightProfileUserIdRef.current,
          userId: user.id
        });
        await inFlightProfilePromiseRef.current;
        if (authUserRef.current?.id !== user.id || !mountedRef.current) {
          devOnlyAuthLog('🧊 Skipping follow-up profile load after in-flight completion', {
            requestId: inFlightProfileRequestIdRef.current,
            userId: user.id
          });
          return;
        }
        return loadUserProfile(user);
      }
      devOnlyAuthLog('⏳ Reusing in-flight profile request', {
        requestId: inFlightProfileRequestIdRef.current,
        userId: user.id
      });
      return inFlightProfilePromiseRef.current;
    }

    const inRehydration = isInRehydrationGraceWindow() || rehydratingRef.current;
    const requestId = (profileRequestIdRef.current += 1);
    inFlightProfileRequestIdRef.current = requestId;
    inFlightProfileUserIdRef.current = user.id;
    const timeoutMs = getProfileTimeoutMs();
    setError(null);
    setProfileStatus(inRehydration ? 'rehydrating' : 'loading');
    setLoading(true);
    devOnlyAuthLog('📥 Profile load start', {
      requestId,
      userId: user.id,
      inRehydration,
      timeoutMs
    });

    const loadPromise = (async () => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;
      try {
        const profilePromise = getProfileWithFamily(user.id);
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          timeoutId = setTimeout(() => {
            timedOut = true;
            resolve('timeout');
          }, timeoutMs);
        });
        const raceResult = await Promise.race([
          profilePromise.then(() => 'resolved'),
          timeoutPromise
        ]);
        if (raceResult === 'timeout') {
          devOnlyAuthLog('⏱️  Profile load timed out', { requestId, timeoutMs });
          if (mountedRef.current && requestId === profileRequestIdRef.current) {
            if (shouldCommitProfileError()) {
              setError('Session sync timed out. Please try again.');
              setProfileStatus('error');
              setLoading(false);
              devOnlyAuthLog('🧱 Timeout error applied', { requestId });
            } else {
              setProfileStatus('rehydrating');
              setLoading(true);
              devOnlyAuthLog('🕰️  Timeout ignored during rehydration', { requestId });
            }
          } else {
            devOnlyAuthLog('🧊 Timeout result ignored (stale)', { requestId });
          }
        }

        const profileWithFamily = await profilePromise;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!mountedRef.current) return;
        if (requestId !== profileRequestIdRef.current) {
          devOnlyAuthLog('🧊 Profile result ignored (stale)', { requestId });
          return;
        }

        if (profileWithFamily) {
          setAppUser(toAppUser(profileWithFamily));
          setError(null);
          setProfileStatus('ready');
          setLoading(false);
          devOnlyAuthLog('✅ Profile loaded successfully', { requestId, timedOut });
        } else {
          // Profile does not exist - edge case
          if (requestId === profileRequestIdRef.current) {
            setError(
              'Your profile was not found. Please contact an administrator.'
            );
            setProfileStatus('error');
            setLoading(false);
            devOnlyAuthLog('❌ Profile not found', { requestId });
          }
        }
      } catch (err) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Silently ignore AbortError (expected on unmount/navigation)
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          devOnlyAuthLog('⚠️  Profile load aborted (expected on navigation)', { requestId });
          return;
        }
        console.error('Error loading profile:', err);
        if (!mountedRef.current) return;
        if (requestId !== profileRequestIdRef.current) {
          devOnlyAuthLog('🧊 Profile error ignored (stale)', { requestId });
          return;
        }
        if (!shouldCommitProfileError()) {
          setProfileStatus('rehydrating');
          setLoading(true);
          devOnlyAuthLog('⏳ Skipping profile error during rehydration grace window', { requestId });
          return;
        }
        setError('Failed to load your profile. Please try again.');
        setProfileStatus('error');
        setLoading(false);
        devOnlyAuthLog('❌ Profile load failed', { requestId });
      }
    })();

    inFlightProfilePromiseRef.current = loadPromise;
    await loadPromise;
    if (inFlightProfilePromiseRef.current === loadPromise) {
      inFlightProfilePromiseRef.current = null;
      inFlightProfileRequestIdRef.current = null;
      inFlightProfileUserIdRef.current = null;
    }
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
            await loadUserProfile(session.user);
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
          setAppUser(null);
          setError(null);
          setProfileStatus('idle');
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

      if (rehydrationTimeoutRef.current) {
        clearTimeout(rehydrationTimeoutRef.current);
        rehydrationTimeoutRef.current = null;
      }

      setAuthUser(session?.user || null);
      setError(null);

      if (session?.user) {
        hadSessionRef.current = true;
        redirectedForSessionLossRef.current = false;
        try {
          if (rehydratingRef.current) {
            setLoading(true);
          }
          const delayMs = getRehydrationDelayMs();
          if (delayMs > 0) {
            devOnlyAuthLog('⏳ Rehydration grace: delaying profile load by', delayMs, 'ms');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          await loadUserProfile(session.user);
          if (rehydratingRef.current) {
            setLoading(false);
            rehydratingRef.current = false;
          }
        } catch (err) {
          console.error("[UserContext] loadUserProfile failed/hung:", err);
          if (!shouldCommitProfileError()) {
            devOnlyAuthLog('⏳ Skipping timeout error during rehydration grace window');
            return;
          }
          rehydratingRef.current = false;
          profileRequestIdRef.current += 1;
          setAppUser(null);
          setError("Session sync timed out. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        const inGraceWindow = isInRehydrationGraceWindow();
        if (hadSessionRef.current && inGraceWindow) {
          rehydratingRef.current = true;
          setLoading(true);
          setAppUser(null);
          setError(null);
          setProfileStatus('rehydrating');
          const delayMs = getRehydrationDelayMs();
          if (delayMs > 0) {
            rehydrationTimeoutRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              if (authUserRef.current) return;
              rehydratingRef.current = false;
              setLoading(false);
              setProfileStatus('idle');
            }, delayMs);
          }
          return;
        }

        rehydratingRef.current = false;
        setAppUser(null);
        setError(null);
        setProfileStatus('idle');
        setLoading(false);
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
      if (rehydrationTimeoutRef.current) {
        clearTimeout(rehydrationTimeoutRef.current);
        rehydrationTimeoutRef.current = null;
      }
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
        profileStatus,
        refreshProfile,
        isProfileReady: profileStatus === 'ready',
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
