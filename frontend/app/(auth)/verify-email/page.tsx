import { Suspense } from 'react';
import VerifyEmail from '@/components/auth/verify-email';
import { Database, MailCheck, ShieldCheck, KeyRound } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  { Icon: MailCheck,   text: 'A verified email keeps your account recoverable' },
  { Icon: ShieldCheck, text: 'Protects your workspace from impersonation' },
  { Icon: KeyRound,    text: 'Password resets go to this address' },
];

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen">

      {/* ── Left: brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[460px] xl:w-[500px] flex-shrink-0 flex-col justify-between p-10"
        style={{ background: 'var(--ds-accent)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Database className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">Intelliquery</span>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="text-[34px] font-bold text-white leading-[1.2] tracking-tight">
              One quick<br />confirmation
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Verifying your email keeps your account secure and recoverable.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[13px] text-white/80 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-white/30">© {new Date().getFullYear()} Intelliquery · All rights reserved</p>
      </div>

      {/* ── Right: content panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-base-0 px-6 py-12">

        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--ds-accent)' }}>
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-content-1">Intelliquery</span>
        </Link>

        <div className="w-full max-w-[400px]">
          <Suspense fallback={
            <div className="flex items-center gap-2 text-content-3 justify-center py-20">
              <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <span className="text-[13px]">Loading…</span>
            </div>
          }>
            <VerifyEmail />
          </Suspense>
        </div>
      </div>

    </div>
  );
}
