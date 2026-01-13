'use client';

import { CheckSquare, User, LogOut } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppDashboard() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to ChoreSpace</h1>
            <p className="text-muted-foreground">Your family chore management hub</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Info
            </CardTitle>
            <CardDescription>
              Your account details and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono text-xs">
                  {user?.id}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled
              >
                View Chores (Coming Soon)
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled
              >
                Family Calendar (Coming Soon)
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled
              >
                Points & Rewards (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>🚀 Next Steps</CardTitle>
            <CardDescription>
              What we&apos;re building next for ChoreSpace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Family Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Invite family members</li>
                  <li>• Set up family roles and permissions</li>
                  <li>• Create family profiles</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Chore System</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create and assign chores</li>
                  <li>• Track completion and points</li>
                  <li>• Set recurring schedules</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Calendar & Planning</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Family calendar integration</li>
                  <li>• To-do lists</li>
                  <li>• Meal planning</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Engagement</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Points and rewards system</li>
                  <li>• Progress tracking</li>
                  <li>• Family leaderboards</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}