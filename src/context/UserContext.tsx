'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/auth/client';
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

  const loadUserProfile = async (user: User | null) => {
    if (!user) {
      setAuthUser(null);
      setAppUser(null);
      return;
    }

    // Avoid concurrent profile loads for the same user
    if (loadingProfileRef.current) {
      await loadingProfileRef.current;
      if (authUser?.id === user.id) {
        return; // Profile already loaded for this user
      }
    }

    const loadPromise = (async () => {
      try {
        const profileWithFamily = await getProfileWithFamily(user.id);

        if (!mountedRef.current) return;

        if (profileWithFamily) {
          setAppUser(toAppUser(profileWithFamily));
        } else {
          // Profile does not exist - edge case
          setError(
            'Your profile was not found. Please contact an administrator.'
          );
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        if (mountedRef.current) {
          setError('Failed to load your profile. Please try again.');
        }
      }
    })();

    loadingProfileRef.current = loadPromise;
    await loadPromise;
    loadingProfileRef.current = null;
  };

  const refreshProfile = async () => {
    if (authUser) {
      await loadUserProfile(authUser);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    let initialized = false;

    const initializeAuth = async () => {
      // Prevent duplicate initialization
      if (initialized) return;
      initialized = true;

      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        setAuthUser(session?.user || null);

        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      setAuthUser(session?.user || null);
      setError(null);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAppUser(null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

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
