import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function AppPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // This shouldn't happen due to middleware, but redirect just in case
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Welcome to ChoreSpace</h1>
        <p className="text-muted-foreground mb-6">
          This is your family chore management dashboard. The full app features will be implemented in the next milestone.
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Your Account</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Next Steps</h2>
            <p className="text-sm text-muted-foreground">
              The complete chore management system, calendar, and family features are coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
