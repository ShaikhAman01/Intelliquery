'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';

const HIDDEN_ROUTES = ['/sign-in', '/sign-up', '/verify-email', '/forgot-password', '/reset-password'];

export function VerifyEmailBanner() {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (isLoading || dismissed || !user || user.emailVerified) return null;
  if (HIDDEN_ROUTES.some((r) => pathname?.startsWith(r))) return null;

  const resend = async () => {
    if (!user.email || resending) return;
    setResending(true);
    setMsg(null);
    const { error } = await (authClient as any).sendVerificationEmail({
      email: user.email,
      callbackURL: '/verify-email',
    });
    setResending(false);
    setMsg(error ? (error.message || 'Could not send. Try again.') : `Sent to ${user.email}. Check your inbox.`);
  };

  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 px-4 py-2 text-[13px]"
      style={{ background: 'var(--ds-warning-muted)', borderBottom: '1px solid var(--ds-warning-border)' }}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ds-warning)' }} />
      <p className="min-w-0 truncate text-content-1">
        <span className="font-semibold">Verify your email</span>{' '}
        <span className="text-content-3">to add database connections, invite teammates and more.</span>
      </p>
      <div className="ml-auto flex flex-shrink-0 items-center gap-3">
        {msg && <span className="hidden text-content-3 sm:inline">{msg}</span>}
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: 'var(--ds-warning)' }}
        >
          {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {resending ? 'Sending…' : 'Resend email'}
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="text-content-3 transition-colors hover:text-content-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
