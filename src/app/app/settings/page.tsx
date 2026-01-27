'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Shield } from 'lucide-react';
import Link from 'next/link';
import { updateFamilyName } from '@/lib/database/profiles';

export default function SettingsPage() {
  const { appUser, loading: userLoading } = useUser();
  const router = useRouter();

  const [familyName, setFamilyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!userLoading) {
      if (!appUser) {
        router.push('/app');
        return;
      } else if (appUser.role !== 'admin') {
        router.push('/app');
        return;
      } else {
        setFamilyName(appUser.family_name);
      }
    }
  }, [appUser, userLoading, router]);

  const handleSave = async () => {
    if (!appUser) return;

    const trimmedName = familyName.trim();
    if (!trimmedName) {
      setSaveError('Family name cannot be empty');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateFamilyName(appUser.family_id, trimmedName);
      setSaveSuccess(true);

      // Refresh the user context to show updated name
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Error updating family name:', error);
      setSaveError('Failed to update family name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!appUser || appUser.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-4">
            This page is only available to family admins. If you believe this is a mistake, contact an admin.
          </p>
          <div className="flex items-center justify-center gap-3">
            {!appUser && (
              <Button variant="secondary" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push('/app')}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
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
        <h1 className="text-3xl font-semibold mb-2">Family Settings</h1>
        <p className="text-muted-foreground">
          Manage your family&apos;s workspace settings. Only admins can access this page.
        </p>
      </div>

      {/* Admin Badge */}
      <Card className="p-4 bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-700">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-700 dark:text-purple-200" />
          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
            You are viewing this page as an admin
          </span>
        </div>
      </Card>

      {/* Family Name Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="family-name" className="block text-sm font-medium mb-2">
              Family Name
            </label>
            <input
              id="family-name"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Your Family Name"
              className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This is the name that appears throughout the app for all family members.
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
                Family name updated successfully!
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

      {/* Family Info Card */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Family Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current Name</span>
            <span className="text-sm font-medium">{appUser.family_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Family ID</span>
            <span className="text-sm font-mono">{appUser.family_id}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
