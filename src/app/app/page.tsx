'use client';

import { useUser } from '@/context/UserContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, User as UserIcon, CheckSquare, Calendar, Star, Utensils } from 'lucide-react';
import { getMyPoints, getPointsTotals } from '@/lib/database/chores';
import type { UserPointsSummary } from '@/lib/database/types';
import Link from 'next/link';

export default function AppDashboard() {
  const { appUser, loading, error, isProfileReady, refreshProfile } = useUser();
  const [myPoints, setMyPoints] = useState<UserPointsSummary | null>(null);
  const [familyPoints, setFamilyPoints] = useState<UserPointsSummary[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const hasAttemptedPointsRef = useRef(false);

  const loadPoints = useCallback(async () => {
    if (!appUser) return;

    try {
      setLoadingPoints(true);
      
      // Load my points
      const myPointsData = await getMyPoints(appUser.id, appUser.family_id);
      setMyPoints(myPointsData);

      // Load family leaderboard
      const familyPointsData = await getPointsTotals(appUser.family_id);
      setFamilyPoints(familyPointsData);
    } finally {
      setLoadingPoints(false);
    }
  }, [appUser]);

  useEffect(() => {
    if (!isProfileReady) return;
    if (document.visibilityState !== "visible") return;
    if (hasAttemptedPointsRef.current) return;
    if (pointsError) return;

    hasAttemptedPointsRef.current = true;

    loadPoints().catch((err) => {
      console.error("Error loading points:", err);
      setPointsError("Failed to load points. Please retry.");
    });
  }, [isProfileReady, pointsError, loadPoints]);

  const retryLoadPoints = () => {
    setPointsError(null);
    hasAttemptedPointsRef.current = false;
  };

  if (loading || loadingPoints) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Profile</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refreshProfile}>
            Retry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact an administrator.
        </p>
      </div>
    );
  }

  if (!appUser) {
    return null;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'member':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'child':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      case 'child':
        return 'Child';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold">
                  {appUser.display_name || appUser.email}
                </h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(appUser.role)}`}>
                  {getRoleLabel(appUser.role)}
                </span>
              </div>
              {appUser.display_name && (
                <p className="text-sm text-muted-foreground">{appUser.email}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {appUser.family_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/app/profile">
              <Button variant="secondary" size="sm">
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </Link>
            {appUser.role === 'admin' && (
              <Link href="/app/settings">
                <Button variant="secondary" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {pointsError ? (
        <div className="error-box">
          <p>{pointsError}</p>
          <Button variant="secondary" size="sm" onClick={retryLoadPoints}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Points Overview */}
          {myPoints && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Your Points</h2>
                    <p className="text-sm text-muted-foreground">
                      {myPoints.completed_chores} chores completed
                    </p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-yellow-600">
                  {myPoints.total_points}
                </div>
              </Card>

              {appUser.role === 'admin' && familyPoints.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <CheckSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Family Leaderboard</h2>
                      <p className="text-sm text-muted-foreground">
                        Top performers this month
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {familyPoints.slice(0, 3).map((member, index) => (
                      <div key={member.profile_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium">
                            {member.display_name || member.profile_id.slice(0, 8)}
                          </span>
                        </div>
                        <span className="font-semibold text-muted-foreground">
                          {member.total_points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Welcome Message */}
      <div>
        <h2 className="text-3xl font-semibold mb-2">
          Welcome to {appUser.family_name}&apos;s ChoreSpace
        </h2>
        <p className="text-muted-foreground">
          {appUser.role === 'admin' 
            ? 'Manage your family\'s chores, assign tasks, and track progress with the built-in points system.'
            : 'View your assigned chores, complete tasks to earn points, and help your family stay organized.'
          }
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/app/chores">
            <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">View Chores</span>
              </div>
              <Button variant="ghost" size="sm">
                Open
              </Button>
            </div>
          </Link>
          
          <div className="flex items-center justify-between p-4 rounded-md border">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>Family Calendar</span>
            </div>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
          
          <Link href="/app/chores">
            <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Points Overview</span>
              </div>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </div>
          </Link>
          
          <div className="flex items-center justify-between p-4 rounded-md border">
            <div className="flex items-center gap-3">
              <Utensils className="h-5 w-5 text-muted-foreground" />
              <span>Family Menu</span>
            </div>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
