'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useSession } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, MailCheck } from 'lucide-react';
import Link from 'next/link';

/**
 * Landing page for email verification links.
 * Better Auth verifies the token at its own endpoint, then redirects here:
 *   - success → no query params (and the user is auto-signed-in)
 *   - failure → ?error=invalid_token | token_expired
 */
export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const failed = !!errorParam;

  const { user } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = user?.email || email;
    if (!target) return;
    setResendError(null);
    startTransition(async () => {
      const { error } = await (authClient as any).sendVerificationEmail({
        email: target,
        callbackURL: '/verify-email',
      });
      if (error) {
        setResendError(error.message || 'Could not send the email. Please try again.');
      } else {
        setSent(true);
      }
    });
  };

  /* ── Resend confirmation ── */
  if (sent) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ds-success-muted)', border: '2px solid var(--ds-success-border)' }}
          >
            <MailCheck className="h-7 w-7 text-success" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[22px] font-bold tracking-tight text-content-1">Check your email</h2>
            <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
              We sent a fresh verification link to{' '}
              <span className="font-medium text-content-2">{user?.email || email}</span>.
              Check your spam folder if it doesn't arrive.
            </p>
          </div>
        </div>
        <p className="text-center text-[13px] text-content-3">
          <Link href="/" className="font-semibold text-content-1 hover:text-brand transition-colors">
            Back to Intelliquery
          </Link>
        </p>
      </div>
    );
  }

  /* ── Expired / invalid link ── */
  if (failed) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ds-error-muted)', border: '2px solid var(--ds-error-border)' }}
          >
            <AlertCircle className="h-7 w-7 text-error" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[22px] font-bold tracking-tight text-content-1">Link expired</h2>
            <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
              This verification link is invalid or has expired. Request a new one below.
            </p>
          </div>
        </div>

        <form onSubmit={handleResend} className="space-y-4">
          {!user?.email && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-content-2">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11"
                autoFocus
              />
            </div>
          )}

          {resendError && (
            <div
              className="flex items-start gap-2.5 rounded-lg p-3 text-[13px]"
              style={{
                background: 'var(--ds-error-muted)',
                border: '1px solid var(--ds-error-border)',
                color: 'var(--ds-error)',
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{resendError}</span>
            </div>
          )}

          <Button type="submit" disabled={isPending} className="w-full h-11 font-semibold text-[14px]">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send a new verification link
          </Button>
        </form>

        <p className="text-center text-[13px] text-content-3">
          <Link href="/" className="font-semibold text-content-1 hover:text-brand transition-colors">
            Back to Intelliquery
          </Link>
        </p>
      </div>
    );
  }

  /* ── Success ── */
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ds-success-muted)', border: '2px solid var(--ds-success-border)' }}
        >
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-[22px] font-bold tracking-tight text-content-1">Email verified</h2>
          <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
            Your email address is confirmed. You're all set to explore your data.
          </p>
        </div>
      </div>
      <Link href="/" className="block">
        <Button className="w-full h-11 gap-2 font-semibold text-[14px]">
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
