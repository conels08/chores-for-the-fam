import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | ChoreSpace',
  description: 'Manage your profile information',
};

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
