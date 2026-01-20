import type { Metadata } from 'next';
import SessionRefreshListener from '@/components/SessionRefreshListener';

export const metadata: Metadata = {
  title: 'Dashboard | ChoreSpace',
  description: 'Your family chore management dashboard',
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SessionRefreshListener />
      {children}
    </div>
  );
}