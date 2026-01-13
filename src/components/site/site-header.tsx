'use client';

import Link from 'next/link';
import { CheckSquare, LogOut, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/context/UserContext';

export function SiteHeader() {
  const { authUser, loading } = useUser();

  const handleSignOut = async () => {
    const { supabase } = await import('@/lib/auth/client');
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
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
