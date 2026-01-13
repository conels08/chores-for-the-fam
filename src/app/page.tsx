export default function RootPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <div className="mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to ChoreSpace
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            A shared family space for chores, points, and clarity.
          </p>
        </div>

        <div className="mb-12">
          <p className="text-lg text-muted-foreground mb-6">
            Simplify family life with chore management, points tracking, and shared planning.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              Sign In
            </a>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Assign Chores</h3>
            <p className="text-muted-foreground">
              Parents can easily assign and track chores across family members.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Earn Points</h3>
            <p className="text-muted-foreground">
              Kids complete tasks and earn points for motivation and accountability.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3a4 4 0 118 0v4m-4 12v4m0-12a4 4 0 110 8 4 4 0 010-8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Stay Organized</h3>
            <p className="text-muted-foreground">
              Family calendar, to-do lists, and meal planning all in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}