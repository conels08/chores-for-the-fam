'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { 
  getChoreWithDetails, 
  updateChore, 
  setChoreActive, 
  listChoreCompletions,
  getFamilyMembers,
  isUserAdmin 
} from '@/lib/database/chores';
import type { DatabaseProfile, ChoreWithAssignments } from '@/lib/database/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Save, X, Archive, Calendar, Users, Star, CheckCircle, User, Clock } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function ChoreDetailsPage() {
  const { appUser, loading: userLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const choreId = params.id as string;
  
  const [chore, setChore] = useState<ChoreWithAssignments | null>(null);
  const [familyMembers, setFamilyMembers] = useState<DatabaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completions, setCompletions] = useState<any[]>([]);

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    points: 0,
    due_date: '',
    assignee_ids: [] as string[]
  });

  const isAdmin = appUser?.role === 'admin';

  const loadChoreDetails = useCallback(async () => {
    if (!appUser) return;

    try {
      setLoading(true);
      setError(null);

      // Load chore details
      const choreData = await getChoreWithDetails(choreId, appUser.family_id);
      
      if (!choreData) {
        setError('Chore not found');
        return;
      }

      setChore(choreData);
      
      // Load completion history
      const completionsData = await listChoreCompletions(choreId, appUser.family_id, 10);
      setCompletions(completionsData);

      // Populate edit form
      setEditData({
        title: choreData.title,
        description: choreData.description || '',
        points: choreData.points,
        due_date: choreData.due_date || '',
        assignee_ids: choreData.assignments.map(a => a.assignee_profile_id)
      });
    } catch (err) {
      console.error('Error loading chore details:', err);
      setError('Failed to load chore details');
    } finally {
      setLoading(false);
    }
  }, [appUser, choreId]);

  const loadFamilyMembers = useCallback(async () => {
    if (!appUser) return;

    try {
      const members = await getFamilyMembers(appUser.family_id);
      setFamilyMembers(members);
    } catch (err) {
      console.error('Error loading family members:', err);
    }
  }, [appUser]);

  useEffect(() => {
    if (appUser) {
      loadChoreDetails();
      if (isAdmin) {
        loadFamilyMembers();
      }
    }
  }, [appUser, choreId, isAdmin, loadChoreDetails, loadFamilyMembers]);

  const handleSave = async () => {
    if (!appUser || !chore) return;

    try {
      setSubmitting(true);
      setError(null);

      // Validate
      if (!editData.title.trim()) {
        throw new Error('Chore title is required');
      }

      if (editData.points < 0) {
        throw new Error('Points cannot be negative');
      }

      // Update chore
      const updatedChore = await updateChore(choreId, appUser.family_id, {
        title: editData.title.trim(),
        description: editData.description.trim() || undefined,
        points: editData.points,
        due_date: editData.due_date || undefined,
        assignee_profile_ids: editData.assignee_ids
      });

      setChore(updatedChore);
      setEditing(false);
    } catch (err: any) {
      console.error('Error updating chore:', err);
      setError(err.message || 'Failed to update chore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!appUser || !chore) return;

    try {
      setSubmitting(true);
      await setChoreActive(choreId, appUser.family_id, false);
      
      // Refresh and redirect
      await loadChoreDetails();
      router.push('/app/chores');
    } catch (err) {
      console.error('Error archiving chore:', err);
      setError('Failed to archive chore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (chore) {
      setEditData({
        title: chore.title,
        description: chore.description || '',
        points: chore.points,
        due_date: chore.due_date || '',
        assignee_ids: chore.assignments.map(a => a.assignee_profile_id)
      });
    }
    setEditing(false);
  };

  const toggleAssignee = (profileId: string) => {
    setEditData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(profileId)
        ? prev.assignee_ids.filter(id => id !== profileId)
        : [...prev.assignee_ids, profileId]
    }));
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';
    
    const date = new Date(dueDate);
    const today = new Date();
    const isOverdue = date < today;
    
    if (isOverdue) {
      return `Overdue - ${date.toLocaleDateString()}`;
    }
    return date.toLocaleDateString();
  };

  const formatCompletionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appUser || !chore) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">
            {error || 'Chore not found or access denied.'}
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chores
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chores
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {editing ? 'Edit Chore' : chore.title}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? 'Manage chore details and assignments' : 'Chore details and completion history'}
              </p>
            </div>
          </div>

          {isAdmin && !editing && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={handleArchive} disabled={submitting}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chore Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Chore Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editData.title}
                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="points">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          min="0"
                          value={editData.points}
                          onChange={(e) => setEditData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={editData.due_date}
                          onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assignees</Label>
                      <div className="space-y-2">
                        {familyMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleAssignee(member.id)}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editData.assignee_ids.includes(member.id)}
                                readOnly
                                className="rounded"
                              />
                              <span className="text-sm">
                                {member.display_name || member.email} ({member.role})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} disabled={submitting}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="ghost" onClick={handleCancel} disabled={submitting}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="text-lg font-semibold">{chore.points} points</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDueDate(chore.due_date)}</span>
                      </div>
                    </div>

                    {chore.description && (
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-muted-foreground">{chore.description}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Created {new Date(chore.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Completion History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No completions yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {completions.map((completion) => (
                      <div key={completion.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              Completed by {completion.assignment.assignee.display_name || completion.assignment.assignee.id.slice(0, 8)}
                            </div>
                            {completion.notes && (
                              <div className="text-sm text-muted-foreground">
                                &ldquo;{completion.notes}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCompletionDate(completion.completed_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chore.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {assignment.assignee.display_name || assignment.assignee.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.assignee.role}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        assignment.assignee.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        assignment.assignee.role === 'member' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {assignment.assignee.role}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Assignments</span>
                  <span className="font-semibold">{chore.assignments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold">{completions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Points per Completion</span>
                  <span className="font-semibold">{chore.points}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}