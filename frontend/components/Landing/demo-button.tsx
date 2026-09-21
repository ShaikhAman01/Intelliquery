'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle } from 'lucide-react';

/**
 * Starts a throwaway demo session and drops the visitor straight into the app.
 *
 * The POST returns a Better Auth session cookie, so by the time we navigate
 * the browser is already signed in as the demo user with the sample database
 * attached.
 */
export function DemoButton({
  className,
  label = 'Try the demo',
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'starting' | 'error'>('idle');

  async function start() {
    setState('starting');
    try {
      const res = await fetch('/api/demo', { method: 'POST' });
      if (!res.ok) throw new Error(`demo start failed: ${res.status}`);
      // Full reload so Better Auth picks the new cookie up on first render.
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      setState('error');
    }
  }

  if (state === 'error') {
    return (
      <div className={className}>
        <button
          onClick={() => { setState('idle'); router.refresh(); }}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-[14px] font-semibold text-content-2 transition-colors hover:text-content-1"
          style={{ background: 'var(--ds-base-1)' }}
        >
          Demo unavailable. Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      disabled={state === 'starting'}
      aria-busy={state === 'starting'}
      className={
        className ??
        'inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-[14px] font-semibold text-content-2 transition-colors hover:bg-base-2 hover:text-content-1 disabled:opacity-60'
      }
      style={{ background: 'var(--ds-base-1)' }}
    >
      {state === 'starting' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Setting up your sandbox
        </>
      ) : (
        <>
          <PlayCircle className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
