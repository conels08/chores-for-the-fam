import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | ChoreSpace',
  description: 'Manage family settings',
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
