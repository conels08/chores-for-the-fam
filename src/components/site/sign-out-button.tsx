'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      className="text-sm"
    >
      Sign out
    </Button>
  );
}
