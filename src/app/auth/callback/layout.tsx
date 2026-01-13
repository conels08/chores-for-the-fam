import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth Callback | ChoreSpace',
  description: 'Authentication callback handler',
};

export default function AuthCallbackLayout({
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
