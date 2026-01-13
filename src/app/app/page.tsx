'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth/client';

export default function AppDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
        return;
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Welcome to your ChoreSpace</h1>
      <p className="text-muted-foreground">
        This is your family dashboard. Chore management features will be added in the next milestone.
      </p>
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between p-4 rounded-md border">
            <span>View Chores</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-md border">
            <span>Family Calendar</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-md border">
            <span>Points Overview</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-md border">
            <span>Family Menu</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}