'use client';

import Link from 'next/link';
import { CheckSquare, LogOut, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useCallback, useRef, useState } from 'react';

export function SiteHeader() {
  const { authUser, loading } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOutInFlightRef = useRef(false);

  const clearSupabaseAuthStorage = useCallback(() => {
    try {
      // localStorage keys vary by project/storageKey; this removes the common ones safely.
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;

        // Supabase v2 common patterns:
        // - sb-<project-ref>-auth-token
        // - any sb-* auth token variants
        if (k.startsWith('sb-') && k.includes('auth-token')) keysToRemove.push(k);

        // Supabase v1 / legacy patterns
        if (k.includes('supabase.auth.token')) keysToRemove.push(k);
      }

      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem('supabase.auth.token');
    } catch {
      // ignore — storage may be blocked
    }
  }, []);


  const handleSignOut = async () => {
    // Single-flight protection (prevents spam clicks piling up)
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;

    setIsSigningOut(true);

    const { supabase, devOnlyAuthLog } = await import('@/lib/auth/client');
    devOnlyAuthLog('👋 Sign out requested');

    const forceLocalSignOutAndRedirect = () => {
      devOnlyAuthLog('🧹 Forcing local sign-out (storage purge) + redirect');
      clearSupabaseAuthStorage();
      // Hard redirect avoids any stuck client/router state
      window.location.assign('/login');
    };

    try {
      // Prefer local scope if supported
      const signOutPromise = supabase.auth.signOut({ scope: 'local' } as any);

      // If locks/storage hang, we don’t wait forever
      const timeoutMs = 2500;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SIGN_OUT_TIMEOUT')), timeoutMs)
      );

      await Promise.race([signOutPromise, timeoutPromise]);

      devOnlyAuthLog('✅ Sign out successful, redirecting to /login');
      // Also clear local tokens to keep header/UI consistent immediately
      clearSupabaseAuthStorage();
      window.location.assign('/login');
    } catch (error: any) {
      devOnlyAuthLog('❌ Sign out error (will fallback):', error);

      // If it’s an AbortError or a timeout, treat it as a lock hang
      const name = error?.name;
      const message = String(error?.message || '');
      const isAbort =
        name === 'AbortError' || message.includes('signal is aborted');
      const isTimeout = message.includes('SIGN_OUT_TIMEOUT');

      if (isAbort || isTimeout) {
        forceLocalSignOutAndRedirect();
        return;
      }

      // Any other unexpected error: still recover locally
      forceLocalSignOutAndRedirect();
    } finally {
      // In practice we redirect, but keep state consistent if redirect is blocked
      setIsSigningOut(false);
      signOutInFlightRef.current = false;
    }
  };


  if (loading) {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckSquare className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>ChoreSpace</span>
          </Link>
          <div className="h-4 w-20 rounded-md bg-muted animate-pulse"></div>
        </div>
      </header>
    );
  }

  const logoHref = authUser ? '/app' : '/';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={logoHref} className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>ChoreSpace</span>
        </Link>

        <nav className="flex items-center gap-2">
          {authUser ? (
            <>
              <Link
                href="/app"
                className="hidden h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70 sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-busy={isSigningOut}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70 disabled:opacity-60 disabled:pointer-events-none"
              >
                <LogOut className="h-4 w-4" />
                <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
              >
                Get started
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70 sm:hidden"
              >
                Start
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
