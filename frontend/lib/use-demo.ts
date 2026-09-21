'use client';

import { useEffect, useState } from 'react';

export type DemoStatus = {
  is_demo: boolean;
  questions_used?: number;
  question_limit?: number;
  questions_remaining?: number;
  expires_at?: string;
  expired?: boolean;
  suggested_questions?: string[];
};

const NOT_DEMO: DemoStatus = { is_demo: false };

// Several components want this at once (the banner, the welcome screen, the
// composer). One in-flight request is shared between them, and the result is
// held until something invalidates it.
let cached: DemoStatus | null = null;
let inFlight: Promise<DemoStatus> | null = null;
const listeners = new Set<(s: DemoStatus) => void>();

async function load(force = false): Promise<DemoStatus> {
  if (!force && cached) return cached;
  if (!force && inFlight) return inFlight;

  inFlight = fetch('/api/v1/demo/status', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : NOT_DEMO))
    .catch(() => NOT_DEMO)
    .then((data: DemoStatus) => {
      cached = data;
      inFlight = null;
      listeners.forEach((fn) => fn(data));
      return data;
    });

  return inFlight;
}

/** Re-read the budget, e.g. straight after a question resolves. */
export function refreshDemoStatus() {
  return load(true);
}

export function useDemoStatus(): DemoStatus & { loading: boolean } {
  const [status, setStatus] = useState<DemoStatus | null>(cached);

  useEffect(() => {
    let alive = true;

    const onChange = (s: DemoStatus) => {
      if (alive) setStatus(s);
    };
    listeners.add(onChange);

    load().then(onChange);

    // Coming back to the tab is the usual moment the budget is stale.
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);

    return () => {
      alive = false;
      listeners.delete(onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { ...(status ?? NOT_DEMO), loading: status === null };
}
