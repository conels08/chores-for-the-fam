import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            // Authenticated user navigation
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              >
                Dashboard
              </Link>
              <SignOutButton />
            </div>
          ) : (
            // Guest navigation
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
