import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings · Intelliquery',
  description: 'Manage your Intelliquery account, profile and connections.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
