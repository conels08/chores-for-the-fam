import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App | ChoreSpace',
  description: 'Your family chore management dashboard',
};

export default function AppLayout({
  children,
}: ReadOnly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh bg-background">
      {children}
    </div>
  );
}
