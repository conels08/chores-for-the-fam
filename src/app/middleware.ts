import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabase = createSupabaseServerClient();
  
  // Get the user's session
  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes - redirect to login if not authenticated
  if (pathname.startsWith('/app') && !session) {
    const loginUrl = new URL('/login', request.nextUrl);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes - redirect to app if already authenticated
  if ((pathname === '/login' || pathname === '/signup') && session) {
    return NextResponse.redirect(new URL('/app', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/signup'],
};