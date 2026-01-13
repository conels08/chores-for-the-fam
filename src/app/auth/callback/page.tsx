import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function AuthCallbackPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated, redirect to app
    redirect('/app');
  } else {
    // No user, redirect to login
    redirect('/login');
  }
}
