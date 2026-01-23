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
  profileStatus: 'idle' | 'loading' | 'ready' | 'error';
  rehydrationStatus: 'idle' | 'rehydrating';
  refreshProfile: () => Promise<void>;
  isProfileReady: boolean;
  authReady: boolean;
  sessionReady: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [rehydrationStatus, setRehydrationStatus] = useState<'idle' | 'rehydrating'>('idle');
  const [authReady, setAuthReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const BASE_PROFILE_TIMEOUT_MS = 4000;
  const REHYDRATION_MAX_MS = 5000;
  const REHYDRATION_PROFILE_TIMEOUT_MS = 12000;

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
  const profileStatusRef = useRef<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const rehydrationStatusRef = useRef<'idle' | 'rehydrating'>('idle');
  const rehydrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rehydrationStartedAtRef = useRef<number | null>(null);
  const rehydrationInFlightRef = useRef(false);
  const rehydrationRetryRef = useRef(false);

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
    profileStatusRef.current = profileStatus;
  }, [profileStatus]);

  useEffect(() => {
    rehydrationStatusRef.current = rehydrationStatus;
  }, [rehydrationStatus]);

  const endRehydration = useCallback((reason: string) => {
    if (rehydrationStatusRef.current !== 'rehydrating') return;
    const startedAt = rehydrationStartedAtRef.current;
    const durationMs = startedAt ? Date.now() - startedAt : null;
    devOnlyAuthLog('✅ Rehydration end', { reason, durationMs });
    rehydrationStatusRef.current = 'idle';
    setRehydrationStatus('idle');
    rehydrationStartedAtRef.current = null;
    if (rehydrationTimeoutRef.current) {
      clearTimeout(rehydrationTimeoutRef.current);
      rehydrationTimeoutRef.current = null;
    }
    if (profileStatusRef.current !== 'loading') {
      setLoading(false);
    }
  }, []);

  const startRehydration = useCallback((reason: string) => {
    if (rehydrationStatusRef.current !== 'rehydrating') {
      devOnlyAuthLog('🔄 Rehydration start', { reason });
      rehydrationStatusRef.current = 'rehydrating';
      rehydrationStartedAtRef.current = Date.now();
      setRehydrationStatus('rehydrating');
      setSessionReady(false);
      setError(null);
      setLoading(true);
      rehydrationRetryRef.current = false;
    } else {
      devOnlyAuthLog('♻️ Rehydration already in progress', { reason });
    }

    if (rehydrationTimeoutRef.current) {
      clearTimeout(rehydrationTimeoutRef.current);
    }
    rehydrationTimeoutRef.current = setTimeout(() => {
      endRehydration('timeout');
    }, REHYDRATION_MAX_MS);
  }, [endRehydration]);

  const getProfileTimeoutMs = () => {
    if (rehydrationStatusRef.current === 'rehydrating') {
      return REHYDRATION_PROFILE_TIMEOUT_MS;
    }
    return BASE_PROFILE_TIMEOUT_MS;
  };

  const shouldCommitProfileError = () => {
    if (!authReadyRef.current) return false;
    if (rehydrationStatusRef.current === 'rehydrating') return false;
    return true;
  };

  const loadUserProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setAuthUser(null);
      setAppUser(null);
      setError(null);
      setProfileStatus('idle');
      if (rehydrationStatusRef.current !== 'rehydrating') {
        setLoading(false);
      }
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

    const inRehydration = rehydrationStatusRef.current === 'rehydrating';
    const requestId = (profileRequestIdRef.current += 1);
    inFlightProfileRequestIdRef.current = requestId;
    inFlightProfileUserIdRef.current = user.id;
    const timeoutMs = getProfileTimeoutMs();
    setError(null);
    setProfileStatus('loading');
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
          devOnlyAuthLog('⏱️  Profile load timed out', { requestId, timeoutMs, inRehydration });
          if (mountedRef.current && requestId === profileRequestIdRef.current) {
            if (inRehydration) {
              setProfileStatus('loading');
              setLoading(true);
              rehydrationRetryRef.current = true;
              devOnlyAuthLog('🕰️  Timeout ignored during rehydration', { requestId });
            } else if (shouldCommitProfileError()) {
              setError('Session sync timed out. Please try again.');
              setProfileStatus('error');
              setLoading(false);
              devOnlyAuthLog('🧱 Timeout error applied', { requestId });
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
          if (rehydrationStatusRef.current !== 'rehydrating') {
            setLoading(false);
          }
          devOnlyAuthLog('✅ Profile loaded successfully', { requestId, timedOut });
          if (rehydrationStatusRef.current === 'rehydrating') {
            endRehydration('profile-ready');
          }
        } else {
          // Profile does not exist - edge case
          if (requestId === profileRequestIdRef.current) {
            setError(
              'Your profile was not found. Please contact an administrator.'
            );
            setProfileStatus('error');
            if (rehydrationStatusRef.current !== 'rehydrating') {
              setLoading(false);
            }
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
          setProfileStatus('loading');
          setLoading(true);
          devOnlyAuthLog('⏳ Skipping profile error during rehydration', { requestId });
          return;
        }
        setError('Failed to load your profile. Please try again.');
        setProfileStatus('error');
        if (rehydrationStatusRef.current !== 'rehydrating') {
          setLoading(false);
        }
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
    if (
      user &&
      rehydrationRetryRef.current &&
      rehydrationStatusRef.current === 'rehydrating' &&
      authUserRef.current?.id === user.id &&
      profileStatusRef.current !== 'ready'
    ) {
      rehydrationRetryRef.current = false;
      devOnlyAuthLog('🔁 Rehydration retrying profile load', { userId: user.id });
      await loadUserProfile(user);
    }
  }, [endRehydration]);

  const refreshProfile = useCallback(async () => {
    if (authUser) {
      devOnlyAuthLog('🔄 Refreshing profile');
      setError(null);
      await loadUserProfile(authUser);
    }
  }, [authUser, loadUserProfile]);

  const rehydrateSession = useCallback(async (reason: string) => {
    if (typeof document === 'undefined') return;
    startRehydration(reason);
    if (rehydrationInFlightRef.current) {
      devOnlyAuthLog('🧭 Rehydration session check already in-flight', { reason });
      return;
    }
    rehydrationInFlightRef.current = true;
    devOnlyAuthLog('🔍 Rehydration: checking session', { reason });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current) return;

      setSessionReady(true);
      if (session?.user) {
        setAuthUser(session.user);
        hadSessionRef.current = true;
        redirectedForSessionLossRef.current = false;
        devOnlyAuthLog('✅ Rehydration session found', { userId: session.user.id });
        if (profileStatusRef.current !== 'ready') {
          devOnlyAuthLog('📥 Rehydration triggering profile refresh', {
            profileStatus: profileStatusRef.current
          });
          await loadUserProfile(session.user);
        } else {
          devOnlyAuthLog('📭 Profile already ready, skipping refresh');
        }
      } else {
        devOnlyAuthLog('⚠️ Rehydration session missing');
      }
    } catch (err) {
      console.error('Rehydration session check failed:', err);
      devOnlyAuthLog('❌ Rehydration session check failed', { err });
    } finally {
      rehydrationInFlightRef.current = false;
      if (mountedRef.current) {
        endRehydration('session-check-complete');
      }
    }
  }, [endRehydration, loadUserProfile, startRehydration]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        devOnlyAuthLog('👀 Tab visible: starting rehydration flow');
        rehydrateSession('visibilitychange');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [rehydrateSession]);

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

        setSessionReady(true);
        setAuthUser(session?.user || null);
        if (session?.user) {
          hadSessionRef.current = true;
          redirectedForSessionLossRef.current = false;
        }

        if (session?.user) {
          devOnlyAuthLog('✅ Initial session found for user:', session.user.id);
          try {
            await loadUserProfile(session.user);
          } catch (err) {
            console.error("[UserContext] loadUserProfile failed/hung:", err);
            if (!shouldCommitProfileError()) {
              devOnlyAuthLog('⏳ Skipping timeout error during rehydration');
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
          if (rehydrationStatusRef.current !== 'rehydrating') {
            setLoading(false);
          }
          setAuthReady(true);
          setSessionReady(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    devOnlyAuthLog('📡 Attaching onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      devOnlyAuthLog('🔄 Auth state changed:', event, session?.user?.id || '(no user)');

      if (!mountedRef.current) return;

      setError(null);
      setSessionReady(true);

      if (session?.user) {
        setAuthUser(session.user);
        hadSessionRef.current = true;
        redirectedForSessionLossRef.current = false;
        try {
          if (rehydrationStatusRef.current === 'rehydrating') {
            setLoading(true);
          }
          await loadUserProfile(session.user);
          if (rehydrationStatusRef.current === 'rehydrating') {
            endRehydration('auth-state-change');
          }
        } catch (err) {
          console.error("[UserContext] loadUserProfile failed/hung:", err);
          if (!shouldCommitProfileError()) {
            devOnlyAuthLog('⏳ Skipping timeout error during rehydration');
            return;
          }
          profileRequestIdRef.current += 1;
          setAppUser(null);
          setError("Session sync timed out. Please try again.");
          if (rehydrationStatusRef.current !== 'rehydrating') {
            setLoading(false);
          }
          return;
        }
      } else {
        devOnlyAuthLog('⚠️ Auth session missing', { event });
        if (rehydrationStatusRef.current === 'rehydrating' && event !== 'SIGNED_OUT') {
          devOnlyAuthLog('🕰️ Session missing during rehydration, deferring logout state', { event });
          return;
        }

        setAuthUser(null);
        setAppUser(null);
        setError(null);
        setProfileStatus('idle');
        if (rehydrationStatusRef.current !== 'rehydrating') {
          setLoading(false);
        }
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
  }, [endRehydration, loadUserProfile]);

  return (
    <UserContext.Provider
      value={{
        authUser,
        appUser,
        loading,
        error,
        profileStatus,
        rehydrationStatus,
        refreshProfile,
        isProfileReady: profileStatus === 'ready',
        authReady,
        sessionReady
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
