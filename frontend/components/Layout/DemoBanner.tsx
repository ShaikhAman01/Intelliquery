'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useDemoStatus } from '@/lib/use-demo';

/** Pinned strip shown only to demo accounts. */
export function DemoBanner() {
  const status = useDemoStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!status.is_demo || dismissed) return null;

  const remaining = status.questions_remaining ?? 0;
  const limit = status.question_limit ?? 0;
  const exhausted = remaining <= 0;

  return (
    <div
      className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-2 text-[12px]"
      style={{ background: exhausted ? 'rgba(245,158,11,0.10)' : 'rgba(37,99,235,0.08)' }}
    >
      <span className="flex items-center gap-1.5 font-semibold text-content-1">
        <Sparkles className="h-3.5 w-3.5" />
        Demo mode
      </span>

      <span className="text-content-2">
        {exhausted
          ? `You have used all ${limit} AI questions. The suggested questions still work.`
          : `${remaining} of ${limit} AI questions left. Connections are read-only here.`}
      </span>

      <Link
        href="/sign-up"
        className="ml-auto rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--ds-accent)' }}
      >
        Create a free account
      </Link>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Hide demo banner"
        className="rounded-md p-1 text-content-3 transition-colors hover:text-content-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
