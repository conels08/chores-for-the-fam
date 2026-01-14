'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, User as UserIcon, Save } from 'lucide-react';
import Link from 'next/link';
import { updateDisplayName } from '@/lib/database/profiles';

export default function ProfilePage() {
  const { appUser, loading: userLoading } = useUser();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!userLoading) {
      if (!appUser) {
        router.push('/app');
        return;
      } else {
        setDisplayName(appUser.display_name || '');
      }
    }
  }, [appUser, userLoading, router]);

  const handleSave = async () => {
    if (!appUser) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateDisplayName(appUser.id, displayName.trim() || appUser.email);
      setSaveSuccess(true);

      // Refresh the user context to show updated name
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Error updating display name:', error);
      setSaveError('Failed to update display name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-semibold mb-2">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your display name and profile information.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {appUser.display_name || appUser.email}
            </h2>
            <p className="text-sm text-muted-foreground">{appUser.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Family: {appUser.family_name}
            </p>
          </div>
        </div>

        {/* Display Name Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={appUser.email}
              className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This is the name other family members will see. Leave empty to use your email.
            </p>
          </div>

          {saveError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-md border border-green-500/50 bg-green-500/15 px-4 py-3">
              <p className="text-sm text-green-900 dark:text-green-100">
                Display name updated successfully!
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{appUser.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm font-medium capitalize">{appUser.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Family</span>
            <span className="text-sm font-medium">{appUser.family_name}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
