'use client';

import { Menu, Settings, Database } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import Link from 'next/link';

type HeaderProps = {
  onHistory?: () => void;
  onReplay?: (question: string, sql: string) => void;
  onSectionSelect?: (section: any) => void;
  activeSection?: 'chart' | 'results' | 'insights' | 'explainer';
  activeView?: 'query' | 'schema' | 'snippets';
  onViewChange?: (view: 'query' | 'schema' | 'snippets') => void;
  children?: React.ReactNode;
};

export const Header = ({
  onReplay,
  onSectionSelect,
  onViewChange,
  activeView = 'query',
  children,
}: HeaderProps) => {

  const handleMobileViewChange = (view: 'query' | 'schema' | 'snippets') => {
    onViewChange?.(view);
    onSectionSelect?.(view);
  };

  return (
    <header className="flex flex-col flex-shrink-0 bg-base-1 border-b border-border">

      {/* ── 48px top bar ─────────────────────────────────────── */}
      <div className="flex items-center h-12 px-4 gap-2">

        {/* Mobile: hamburger → Sheet → Sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation"
              className="h-7 w-7 flex items-center justify-center rounded-md text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms] lg:hidden flex-shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[232px] p-0 border-r border-border"
            style={{ background: 'var(--ds-base-1)' }}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Application navigation sidebar</SheetDescription>
            <Sidebar
              className="w-full h-full border-r-0"
              activeView={activeView}
              onViewChange={handleMobileViewChange}
              onReplay={onReplay}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>

        {/* Logo — visible on mobile only; desktop shows this in the sidebar */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="h-6 w-6 flex items-center justify-center rounded-md bg-brand text-white flex-shrink-0">
            <Database className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-content-1 tracking-tight">Intelliquery</span>
        </div>

        {/* Spacer pushes actions to the right */}
        <div className="flex-1" />

        {/* Right actions */}
        <Link
          href="/settings"
          aria-label="Settings"
          className="h-7 w-7 flex items-center justify-center rounded-md text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Query input area ──────────────────────────────────────
          Phase 4 moves this into the main content body.
          Rendered here for backward compatibility with page.tsx. */}
      {children && (
        <div className="border-t border-border">
          {children}
        </div>
      )}
    </header>
  );
};
