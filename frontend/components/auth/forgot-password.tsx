'use client';

import { useState, useTransition } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await (authClient as any).requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message || 'Something went wrong. Please try again.');
      } else {
        setSent(true);
      }
    });
  };

  if (sent) {
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
            <h2 className="text-[22px] font-bold tracking-tight text-content-1">Check your email</h2>
            <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
              If <span className="font-medium text-content-2">{email}</span> is registered, you'll receive a reset link shortly. Check your spam folder if it doesn't arrive.
            </p>
          </div>
        </div>

        <p className="text-center text-[13px] text-content-3">
          Didn't get it?{' '}
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(''); }}
            className="font-semibold text-content-1 hover:text-brand transition-colors"
          >
            Try a different email
          </button>
        </p>

        <div className="text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-[13px] text-content-3 hover:text-content-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h2 className="text-[22px] font-bold tracking-tight text-content-1">Forgot your password?</h2>
        <p className="text-[14px] text-content-3">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && (
          <div
            className="flex items-start gap-2.5 rounded-lg p-3 text-[13px]"
            style={{
              background: 'var(--ds-error-muted)',
              border: '1px solid var(--ds-error-border)',
              color: 'var(--ds-error)',
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={isPending} className="w-full h-11 font-semibold text-[14px]">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <p className="text-center text-[13px] text-content-3">
        Remembered it?{' '}
        <Link href="/sign-in" className="font-semibold text-content-1 hover:text-brand transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
