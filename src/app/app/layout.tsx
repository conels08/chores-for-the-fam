import { SiteHeader } from '@/components/site/site-header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}