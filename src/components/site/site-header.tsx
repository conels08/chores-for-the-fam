'use client';

import Link from 'next/link';
import { CheckSquare, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth/client';

export function SiteHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Auth state check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthState();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>ChoreSpace</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
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
