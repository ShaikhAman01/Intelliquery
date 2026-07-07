import { Database } from 'lucide-react';
import Link from 'next/link';

/**
 * Shared shell for static content pages (/docs, /terms, /privacy).
 * Server-renderable; uses design-system tokens so it follows light/dark mode.
 */

export function InfoPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ds-base-0)' }}>
      {/* Top bar */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-6 border-b border-border"
        style={{ background: 'var(--ds-base-1)' }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ds-accent)' }}>
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-content-1">Intelliquery</span>
        </Link>
        <div className="ml-auto">
          <Link
            href="/"
            className="text-[13px] font-medium text-content-3 hover:text-content-1 transition-colors"
          >
            Back to app
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-12">
          <h1 className="text-[28px] font-bold tracking-tight text-content-1">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-content-3">{subtitle}</p>}
          <div className="mt-8 space-y-8">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border py-6" style={{ background: 'var(--ds-base-1)' }}>
        <p className="text-center text-[12px] text-content-3">
          Intelliquery · © {new Date().getFullYear()} All rights reserved ·{' '}
          <Link href="/terms" className="hover:text-content-1 transition-colors underline">Terms</Link> ·{' '}
          <Link href="/privacy" className="hover:text-content-1 transition-colors underline">Privacy</Link> ·{' '}
          <Link href="/docs" className="hover:text-content-1 transition-colors underline">Docs</Link>
        </p>
      </footer>
    </div>
  );
}

/** A titled section within an InfoPage. */
export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold text-content-1 mb-3">{title}</h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-content-2">{children}</div>
    </section>
  );
}
