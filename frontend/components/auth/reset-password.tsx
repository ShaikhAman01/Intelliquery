'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PasswordStrength } from '@/components/auth/password-strength';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invalidToken = searchParams.get('error') === 'INVALID_TOKEN';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = password === confirm;
  const isStrong = password.length >= 8;
  const canSubmit = isStrong && passwordsMatch && !!token;

  if (invalidToken) {
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
              This password reset link has expired or has already been used. Reset links are valid for 1 hour.
            </p>
          </div>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full h-11 font-semibold text-[14px]">Request a new link</Button>
        </Link>
        <p className="text-center text-[13px] text-content-3">
          <Link href="/sign-in" className="font-semibold text-content-1 hover:text-brand transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-1">
          <h2 className="text-[22px] font-bold tracking-tight text-content-1">Invalid link</h2>
          <p className="text-[14px] text-content-3">This reset link is missing a token.</p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full h-11 font-semibold text-[14px]">Request a new link</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const { error } = await (authClient as any).resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setError(error.message || 'Failed to reset password. The link may have expired.');
      } else {
        router.push('/sign-in?reset=success');
      }
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h2 className="text-[22px] font-bold tracking-tight text-content-1">Set a new password</h2>
        <p className="text-[14px] text-content-3">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-medium text-content-2">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="h-11 pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-[13px] font-medium text-content-2">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Same password again"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="h-11 pr-10"
              style={confirm && !passwordsMatch ? { borderColor: 'var(--ds-error)' } : {}}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm && !passwordsMatch && (
            <p className="text-[12px] text-error">Passwords don't match.</p>
          )}
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

        <Button type="submit" disabled={!canSubmit || isPending} className="w-full h-11 font-semibold text-[14px]">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset password
        </Button>
      </form>

      <p className="text-center text-[13px] text-content-3">
        <Link href="/sign-in" className="font-semibold text-content-1 hover:text-brand transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
