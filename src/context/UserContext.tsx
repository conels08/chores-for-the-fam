'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  const loadUserProfile = async (user: User | null) => {
    if (!user) {
      setAuthUser(null);
      setAppUser(null);
      return;
    }

    try {
      const profileWithFamily = await getProfileWithFamily(user.id);

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
      setError('Failed to load your profile. Please try again.');
    }
  };

  const refreshProfile = async () => {
    if (authUser) {
      await loadUserProfile(authUser);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setAuthUser(session?.user || null);

        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setAuthUser(session?.user || null);
      setError(null);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAppUser(null);
      }
    });

    return () => {
      mounted = false;
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
