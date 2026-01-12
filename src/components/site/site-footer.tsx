export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-8 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ChoreSpace. Built for calm, clear family routines.
        </p>
        <p className="text-xs text-muted-foreground">
          MVP in progress — chores, points, calendar, and more coming soon.
        </p>
      </div>
    </footer>
  );
}
