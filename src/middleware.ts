import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from './lib/supabase/server';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Create a response object to get cookies
  const response = NextResponse.next();
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app routes - redirect to login if not authenticated
  if (pathname.startsWith('/app') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages (except callback)
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // Allow auth callback to proceed normally
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
