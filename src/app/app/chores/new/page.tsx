'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { createChore, getFamilyMembers } from '@/lib/database/chores';
import type { DatabaseProfile } from '@/lib/database/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewChorePage() {
  const { appUser, loading: userLoading } = useUser();
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState<DatabaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: 1,
    due_date: '',
    assignee_ids: [] as string[]
  });

  const loadFamilyMembers = useCallback(async () => {
    if (!appUser) return;

    try {
      setLoading(true);
      const members = await getFamilyMembers(appUser.family_id);
      setFamilyMembers(members);
    } catch (err) {
      console.error('Error loading family members:', err);
      setError('Failed to load family members');
    } finally {
      setLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;
    if (appUser.role !== 'admin') return;
    loadFamilyMembers();
  }, [appUser, loadFamilyMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appUser) return;

    try {
      setSubmitting(true);
      setError(null);

      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Chore title is required');
      }

      if (formData.points < 0) {
        throw new Error('Points cannot be negative');
      }

      if (formData.assignee_ids.length === 0) {
        throw new Error('Please select at least one assignee');
      }

      // Create the chore
      await createChore(
        {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          points: formData.points,
          due_date: formData.due_date || null,
          assignee_profile_ids: formData.assignee_ids
        },
        appUser.family_id,
        appUser.id
      );

      // Redirect back to chores page with success
      router.push('/app/chores?success=chore-created');
    } catch (err: any) {
      console.error('Error creating chore:', err);
      setError(err.message || 'Failed to create chore');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (profileId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(profileId)
        ? prev.assignee_ids.filter(id => id !== profileId)
        : [...prev.assignee_ids, profileId]
    }));
  };

  const formatFamilyMemberName = (member: DatabaseProfile) => {
    if (member.display_name) {
      return `${member.display_name} (${member.role})`;
    }
    return `${member.email} (${member.role})`;
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to create a new chore.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
              <Button variant="ghost" onClick={() => router.push('/app/chores')}>
                Back to Chores
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (appUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Admin access required</h2>
            <p className="text-muted-foreground mb-4">
              Only admins can create chores for the family. Ask an admin to add a new chore.
            </p>
            <Button variant="secondary" onClick={() => router.push('/app/chores')}>
              Back to Chores
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chores
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Chore</h1>
            <p className="text-muted-foreground mt-1">
              Assign chores to family members and track their progress
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Chore Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Chore Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Take out the trash"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional details about the chore..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Points and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points">Points *</Label>
                  <Input
                    id="points"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.points}
                    onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Points earned when chore is completed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-3">
                <Label>Assign to Family Members *</Label>
                <p className="text-sm text-muted-foreground">
                  Select who should complete this chore. Multiple people can be assigned.
                </p>
                
                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleAssignee(member.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.assignee_ids.includes(member.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {formData.assignee_ids.includes(member.id) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.display_name || member.email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.role}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        member.role === 'member' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>

                {formData.assignee_ids.length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">
                      Selected ({formData.assignee_ids.length}):
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.assignee_ids
                        .map(id => {
                          const member = familyMembers.find(m => m.id === id);
                          return member?.display_name || member?.email || 'Unknown';
                        })
                        .join(', ')
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    'Creating...'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Chore
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
