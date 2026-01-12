import Link from 'next/link';
import { CalendarDays, CheckCircle2, Sparkles, Trophy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pb-16 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              A supportive family chore workspace
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Chores that feel fair.
              <span className="block text-muted-foreground">Routines that actually stick.</span>
            </h1>
            <p className="max-w-prose text-pretty text-base text-muted-foreground sm:text-lg">
              ChoreSpace helps families assign chores, track completion, and celebrate progress—without
              guilt, nagging, or spreadsheets.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create your family space
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-6 text-base font-medium transition-colors hover:bg-muted/60"
              >
                Sign in
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Supabase auth & family isolation coming next. This repo is initialized and ready.
            </p>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-muted/50 to-background p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Chores
                  </CardTitle>
                  <CardDescription>Assign, complete, and log progress.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Recurring or one-off tasks</li>
                    <li>• Deadlines (optional)</li>
                    <li>• Completion history</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                    Points
                  </CardTitle>
                  <CardDescription>Motivating, never punitive.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Per-user totals</li>
                    <li>• Optional leaderboard</li>
                    <li>• Admin-controlled resets</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Calendar
                  </CardTitle>
                  <CardDescription>One shared family view.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Events managed by parents</li>
                    <li>• Optional chore deadlines</li>
                    <li>• Always on “today”</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Menu
                  </CardTitle>
                  <CardDescription>Kids can check what’s available.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Admin-managed meals</li>
                    <li>• View-only for members</li>
                    <li>• Simple, clear layout</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h2 className="text-lg font-semibold">Clear expectations</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everyone sees the same plan—who’s responsible, what’s done, and what’s next.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Supportive by design</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Points encourage consistency. No negative scores, no shame, and no clutter.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Built for real families</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Mobile-first UX for busy parents and kid-friendly dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
