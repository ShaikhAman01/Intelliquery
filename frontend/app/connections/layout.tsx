import type { Metadata } from 'next';

// These routes render client components, which cannot export metadata
// themselves, so the segment layout carries it.
export const metadata: Metadata = {
  title: 'Connections — Intelliquery',
  description: 'Connect and manage the databases Intelliquery can query.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
