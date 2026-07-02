'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';
import { getInviteInfo, acceptInviteByToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle2, AlertCircle, ArrowRight, Users, Shield, BarChart3 } from 'lucide-react';

interface InviteInfo {
  kind: 'invite' | 'org_link';
  org_name: string;
  inviter_name: string | null;
  role: string;
  email: string | null;
}

const FEATURES = [
  { Icon: Users,     text: 'Shared database connections and query history' },
  { Icon: BarChart3, text: 'Ask questions in plain English, get charts back' },
  { Icon: Shield,    text: 'Role-based access keeps your data safe' },
];

export default function InviteLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { session, isLoading: authLoading } = useSession();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    getInviteInfo(slug)
      .then(setInfo)
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setInfoError(err.response?.data?.detail || 'This invitation link is invalid or has expired.');
      });
  }, [slug]);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      await acceptInviteByToken(slug);
      setJoined(true);
      setTimeout(() => router.push('/'), 1800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setJoinError(e.response?.data?.detail || 'Something went wrong while joining. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const loading = authLoading || (!info && !infoError);
  const roleLabel = info ? info.role.charAt(0).toUpperCase() + info.role.slice(1) : '';
  const returnTo = encodeURIComponent(`/invite/${slug}`);

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
              Better together
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Join your team and start exploring your data — no SQL required.
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
          {loading ? (
            <div className="flex items-center gap-2 text-content-3 justify-center py-20">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[13px]">Loading invitation…</span>
            </div>

          ) : infoError ? (
            /* ── Invalid / expired link ── */
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--ds-error-muted)', border: '2px solid var(--ds-error-border)' }}
                >
                  <AlertCircle className="h-7 w-7 text-error" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-bold tracking-tight text-content-1">Invitation not found</h2>
                  <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">{infoError}</p>
                  <p className="text-[13px] text-content-3">Ask your teammate to send you a new one.</p>
                </div>
              </div>
              <p className="text-center text-[13px] text-content-3">
                <Link href="/" className="font-semibold text-content-1 hover:text-brand transition-colors">
                  Back to Intelliquery
                </Link>
              </p>
            </div>

          ) : joined ? (
            /* ── Success ── */
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--ds-success-muted)', border: '2px solid var(--ds-success-border)' }}
                >
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-bold tracking-tight text-content-1">You&apos;re in!</h2>
                  <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
                    You&apos;ve joined <span className="font-medium text-content-2">{info?.org_name}</span> as {info?.role}.
                    Taking you to your workspace…
                  </p>
                </div>
              </div>
            </div>

          ) : (
            /* ── Invitation details ── */
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--ds-base-2)', border: '2px solid var(--ds-border-subtle)' }}
                >
                  <Users className="h-7 w-7 text-content-2" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-bold tracking-tight text-content-1">
                    Join {info?.org_name}
                  </h2>
                  <p className="text-[14px] text-content-3 max-w-[320px] leading-relaxed">
                    {info?.inviter_name ? (
                      <><span className="font-medium text-content-2">{info.inviter_name}</span> invited you to their team on Intelliquery.</>
                    ) : (
                      <>You&apos;ve been invited to a team on Intelliquery.</>
                    )}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold mt-1"
                    style={{ background: 'var(--ds-base-2)', color: 'var(--ds-text-2)', border: '1px solid var(--ds-border-subtle)' }}
                  >
                    <Shield className="h-3 w-3" /> You&apos;ll join as {roleLabel}
                  </span>
                </div>
              </div>

              {joinError && (
                <div
                  className="flex items-start gap-2.5 rounded-lg p-3 text-[13px]"
                  style={{
                    background: 'var(--ds-error-muted)',
                    border: '1px solid var(--ds-error-border)',
                    color: 'var(--ds-error)',
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}

              {session ? (
                <div className="space-y-3">
                  <Button onClick={handleJoin} disabled={joining} className="w-full h-11 gap-2 font-semibold text-[14px]">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {joining ? 'Joining…' : `Join ${info?.org_name}`}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/')}
                    disabled={joining}
                    className="w-full h-11 text-[14px] text-content-3"
                  >
                    Not now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href={`/sign-up?redirect=${returnTo}`} className="block">
                    <Button className="w-full h-11 gap-2 font-semibold text-[14px]">
                      Create an account to join
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-center text-[13px] text-content-3">
                    Already have an account?{' '}
                    <Link href={`/sign-in?redirect=${returnTo}`} className="font-semibold text-content-1 hover:text-brand transition-colors">
                      Sign in
                    </Link>
                  </p>
                  {info?.email && (
                    <p className="text-center text-[12px] text-content-3">
                      This invitation was sent to <span className="font-medium">{info.email}</span> — use that email.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
