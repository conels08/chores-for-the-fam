'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';

type InviteDetails = {
  id: string;
  family_id: string;
  type: 'adult' | 'kid';
  role_hint: 'admin' | 'member' | 'child';
  email: string | null;
  expires_at: string;
};

type InviteStatus = 'validating' | 'ready' | 'error' | 'success';

function InvitePageContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [status, setStatus] = useState<InviteStatus>('validating');
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [kidName, setKidName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const didValidateRef = useRef(false);
  const { authUser, appUser, loading: authLoading } = useUser();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing invite token.');
      return;
    }

    if (didValidateRef.current) return;
    didValidateRef.current = true;
    let isActive = true;

    const validate = async () => {
      setStatus('validating');
      setError(null);
      try {
        const response = await fetch('/api/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Invite validation failed.');
        }

        if (isActive) {
          setInvite(payload.invite as InviteDetails);
          setStatus('ready');
        }
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Invite validation failed.';
        setError(message);
        setStatus('error');
      }
    };

    validate();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleAcceptAdult = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite || invite.type !== 'adult') return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          type: 'adult',
          displayName,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to accept invite.');
      }

      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to accept invite.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptKid = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite || invite.type !== 'kid') return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          type: 'kid',
          kidName,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to accept invite.');
      }

      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to accept invite.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'validating') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Validating invite</CardTitle>
            <CardDescription>Hang tight while we check your invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Checking invite status...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invite error</CardTitle>
            <CardDescription>We could not validate this invite.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error ?? 'Invite is no longer available.'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invite accepted</CardTitle>
            <CardDescription>You have successfully joined the family.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You can now continue to the app.
            </p>
            <Link
              href="/app"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Go to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdultInvite = invite?.type === 'adult';
  const isKidInvite = invite?.type === 'kid';
  const isAdmin = appUser?.role === 'admin';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Accept your invite</CardTitle>
          <CardDescription>
            {isAdultInvite
              ? 'Complete your profile to join the family.'
              : 'Add a child profile to the family.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invite && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p>Invite type: <span className="font-medium text-foreground">{invite.type}</span></p>
              {isAdultInvite && (
                <p>Role: <span className="font-medium text-foreground">{invite.role_hint}</span></p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isAdultInvite && (
            <div className="space-y-4">
              {authLoading ? (
                <p className="text-sm text-muted-foreground">Checking authentication...</p>
              ) : !authUser ? (
                <p className="text-sm text-muted-foreground">
                  Please{' '}
                  <Link href="/login" className="text-foreground underline underline-offset-4">
                    sign in
                  </Link>{' '}
                  or{' '}
                  <Link href="/signup" className="text-foreground underline underline-offset-4">
                    create an account
                  </Link>{' '}
                  to accept this invite.
                </p>
              ) : (
                <form onSubmit={handleAcceptAdult} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="display-name">
                      Display name
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    disabled={submitting}
                  >
                    {submitting ? 'Accepting...' : 'Accept invite'}
                  </button>
                </form>
              )}
            </div>
          )}

          {isKidInvite && (
            <div className="space-y-4">
              {authLoading ? (
                <p className="text-sm text-muted-foreground">Checking authentication...</p>
              ) : !authUser ? (
                <p className="text-sm text-muted-foreground">
                  An admin needs to sign in to accept this invite.
                </p>
              ) : !isAdmin ? (
                <p className="text-sm text-muted-foreground">
                  This invite can only be accepted by an admin from the family.
                </p>
              ) : (
                <form onSubmit={handleAcceptKid} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="kid-name">
                      Kid name
                    </label>
                    <input
                      id="kid-name"
                      type="text"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={kidName}
                      onChange={(event) => setKidName(event.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    disabled={submitting}
                  >
                    {submitting ? 'Adding...' : 'Add child profile'}
                  </button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading invite</CardTitle>
              <CardDescription>Preparing your invitation...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading invite...
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}
