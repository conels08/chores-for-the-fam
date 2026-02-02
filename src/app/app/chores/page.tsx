'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { listMyAssignedChores, listFamilyChores, completeAssignment, getPointsTotals, getMyPoints } from '@/lib/database/chores';
import type { ChoreWithAssignments, UserPointsSummary } from '@/lib/database/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Plus, Users, Calendar, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChoresPage() {
  const { appUser, loading: userLoading } = useUser();
  const router = useRouter();
  const [myChores, setMyChores] = useState<ChoreWithAssignments[]>([]);
  const [allChores, setAllChores] = useState<ChoreWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [myPoints, setMyPoints] = useState<UserPointsSummary | null>(null);
  const [familyPoints, setFamilyPoints] = useState<UserPointsSummary[]>([]);

  const isAdmin = appUser?.role === 'admin';

  const loadChores = useCallback(async () => {
    if (!appUser) return;

    try {
      setLoading(true);
      setError(null);

      // Load user's assigned chores
      const myChoresData = await listMyAssignedChores(appUser.id, appUser.family_id);
      setMyChores(myChoresData);

      // If admin, load all family chores
      if (isAdmin) {
        const allChoresData = await listFamilyChores(appUser.family_id);
        setAllChores(allChoresData);
      }
    } catch (err) {
      console.error('Error loading chores:', err);
      setError('Failed to load chores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appUser, isAdmin]);

  const loadPoints = useCallback(async () => {
    if (!appUser) return;

    try {
      // Load my points
      const myPointsData = await getMyPoints(appUser.id, appUser.family_id);
      setMyPoints(myPointsData);

      // Load family leaderboard
      const familyPointsData = await getPointsTotals(appUser.family_id);
      setFamilyPoints(familyPointsData);
    } catch (err) {
      console.error('Error loading points:', err);
    }
  }, [appUser]);

  useEffect(() => {
    if (appUser) {
      loadChores();
      loadPoints();
    }
  }, [appUser, loadChores, loadPoints]);

  useEffect(() => {
    if (!userLoading && !appUser) {
      setLoading(false);
    }
  }, [userLoading, appUser]);

  const handleCompleteChore = async (assignmentId: string) => {
    if (!appUser) return;
    if (!assignmentId) return;

    try {
      setCompletingIds(prev => new Set(prev).add(assignmentId));
      
      await completeAssignment(assignmentId, appUser.id);
      
      // Refresh data
      await loadChores();
      await loadPoints();
      
      // Show success feedback (you could add a toast here)
    } catch (err) {
      console.error('Error completing chore:', err);
      setError('Failed to complete chore. Please try again.');
    } finally {
      setCompletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const today = new Date();
    const isOverdue = date < today;
    
    return {
      text: date.toLocaleDateString(),
      isOverdue
    };
  };

  const getChoreStatus = (chore: ChoreWithAssignments) => {
    const now = new Date();
    const dueDate = chore.due_date ? new Date(chore.due_date) : null;
    
    if (!dueDate) return 'no-due';
    
    if (dueDate < now) return 'overdue';
    if (dueDate.toDateString() === now.toDateString()) return 'due-today';
    return 'upcoming';
  };

  const incompleteMyChores = myChores.filter((chore) => {
    const myAssignment =
      chore.assignments?.find(a =>
        a.assignee_profile_id === appUser?.id ||
        a.assignee?.id === appUser?.id
      ) ?? null;
    const isCompleted = (myAssignment?.completions?.length ?? 0) > 0;
    return !isCompleted;
  });

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your chores.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
              <Button variant="ghost" onClick={() => router.push('/app')}>
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chores</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Manage family chores and track progress' : 'Complete your assigned chores and earn points'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => router.push('/app/chores/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Chore
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Points Overview */}
        {myPoints && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Your Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{myPoints.total_points}</div>
                <p className="text-muted-foreground">
                  {myPoints.completed_chores} chores completed
                </p>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Family Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {familyPoints.slice(0, 3).map((member, index) => (
                      <div key={member.profile_id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mr-3">
                            {index + 1}
                          </span>
                          <span className="font-medium">
                            {member.display_name || member.profile_id.slice(0, 8)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">{member.total_points}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* My Chores Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">My Chores</h2>
          
          {myChores.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? "No chores assigned yet. Create your first chore to get started!"
                    : "No chores assigned yet. Check back later or ask your parent to assign some chores."
                  }
                </p>
              </CardContent>
            </Card>
          ) : incompleteMyChores.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  You&apos;re all caught up! New chores will appear here when they&apos;re assigned.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incompleteMyChores.map((chore) => {
                const dueDateInfo = formatDueDate(chore.due_date);
                const status = getChoreStatus(chore);
                const myAssignment =
                  chore.assignments?.find(a =>
                    a.assignee_profile_id === appUser?.id ||
                    a.assignee?.id === appUser?.id
                  ) ?? null;
                const assignmentId = myAssignment?.id ?? '';
                const isCompleted = (myAssignment?.completions?.length ?? 0) > 0;
                
                return (
                  <Card key={chore.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{chore.title}</h3>
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{chore.points}</span>
                            </div>
                            {dueDateInfo && (
                              <div className={`flex items-center gap-1 text-sm ${
                                dueDateInfo.isOverdue ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                <Calendar className="w-4 h-4" />
                                <span>{dueDateInfo.text}</span>
                              </div>
                            )}
                          </div>
                          
                          {chore.description && (
                            <p className="text-muted-foreground text-sm mb-2">
                              {chore.description}
                            </p>
                          )}
                          
                          {isAdmin && chore.assignments.length > 1 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>Also assigned to {chore.assignments.length - 1} others</span>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleCompleteChore(assignmentId)}
                          disabled={!assignmentId || isCompleted || completingIds.has(assignmentId)}
                          className="ml-4"
                        >
                          {isCompleted ? (
                            'Completed'
                          ) : completingIds.has(assignmentId) ? (
                            'Completing...'
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* All Chores Section (Admin Only) */}
        {isAdmin && (
          <div>
            <h2 className="text-xl font-semibold mb-4">All Family Chores</h2>
            {allChores.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">
                    No family chores yet. Create a chore to start assigning tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allChores.map((chore) => (
                  <Card key={chore.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{chore.title}</h3>
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{chore.points}</span>
                            </div>
                            {chore.due_date && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDueDate(chore.due_date)?.text}</span>
                              </div>
                            )}
                          </div>
                          
                          {chore.description && (
                            <p className="text-muted-foreground text-sm mb-2">
                              {chore.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>
                              Assigned to: {chore.assignments
                                .map(a =>
                                  a.assignee?.display_name ??
                                  a.assignee_id?.slice(0, 8) ??
                                  'Unassigned'
                                )
                                .join(', ')
                              }
                            </span>
                          </div>
                        </div>
                        
                        <Button variant="ghost" onClick={() => router.push(`/app/chores/${chore.id}`)} className="ml-4">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
