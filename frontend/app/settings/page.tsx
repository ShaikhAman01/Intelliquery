'use client';

import { AuthGuard, useSession } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User, Building2, Users, Shield, Mail, Copy, Check,
  Loader2, AlertCircle, ArrowLeft, Pencil, LogOut, Eye, EyeOff,
} from 'lucide-react';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  updateProfile,
  getOrganization,
  createOrganization,
  updateOrganization,
  getTeamMembers,
  inviteTeamMember,
} from '@/lib/api';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

/* ── Status message ──────────────────────────────────────── */

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px]"
      style={{
        background: type === 'success' ? 'var(--ds-success-muted)' : 'var(--ds-error-muted)',
        border: `1px solid ${type === 'success' ? 'var(--ds-success-border)' : 'var(--ds-error-border)'}`,
        color: type === 'success' ? 'var(--ds-success)' : 'var(--ds-error)',
      }}
    >
      {type === 'error'
        ? <AlertCircle className="h-4 w-4 shrink-0" />
        : <Check className="h-4 w-4 shrink-0" />
      }
      <span>{message}</span>
    </div>
  );
}

/* ── Page layout ─────────────────────────────────────────── */

type Tab = 'profile' | 'organization' | 'team';

function SettingsContent() {
  const { user } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getOrganization()
      .then((data: { org?: Record<string, unknown> }) => { if (data?.org) setOrg(data.org); })
      .catch(() => {});
  }, []);

  const NAV: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'profile',      label: 'Profile',      Icon: User      },
    { key: 'organization', label: 'Organization', Icon: Building2 },
    { key: 'team',         label: 'Team',         Icon: Users     },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ds-base-0)' }}>

      {/* Top bar */}
      <div
        className="h-14 flex-shrink-0 flex items-center justify-between border-b border-border px-6"
        style={{ background: 'var(--ds-base-1)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="gap-1.5 text-content-3 hover:text-content-1 -ml-1 text-[13px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="text-[14px] font-semibold text-content-1">Settings</span>
        <div className="w-16" />
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar nav */}
        <aside
          className="hidden sm:flex w-[220px] flex-shrink-0 flex-col border-r border-border p-4 gap-1"
          style={{ background: 'var(--ds-base-1)' }}
        >
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-[14px] text-left transition-colors duration-[100ms]',
                activeTab === key
                  ? 'bg-base-3 text-content-1 font-medium'
                  : 'text-content-3 hover:bg-base-2 hover:text-content-1',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Mobile tab row */}
        <div className="sm:hidden w-full absolute top-14 z-10 flex border-b border-border" style={{ background: 'var(--ds-base-1)' }}>
          {NAV.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors duration-[100ms]',
                activeTab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-content-3',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 sm:px-10 sm:pt-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {activeTab === 'profile'      && <ProfileTab user={user} />}
            {activeTab === 'organization' && <OrgTab existingOrg={org} setExistingOrg={setOrg} />}
            {activeTab === 'team'         && <TeamTab orgSlug={org?.slug as string | undefined} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Section layout helpers ──────────────────────────────── */

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--ds-base-0)', boxShadow: 'var(--ds-shadow-sm)' }}>
      <div className="px-6 py-4 border-b border-border" style={{ background: 'var(--ds-base-1)' }}>
        <h3 className="text-[15px] font-semibold text-content-1">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-content-3">{description}</p>}
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}

/* ── Change password section ─────────────────────────────── */

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = next === confirm;
  const isStrong = next.length >= 8;
  const canSubmit = !!current && isStrong && passwordsMatch && !!confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setMsg(null);
    startTransition(async () => {
      const { error } = await (authClient as any).changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (error) {
        setMsg({ text: error.message || 'Failed to change password.', type: 'error' });
      } else {
        setMsg({ text: 'Password changed. Other sessions have been signed out.', type: 'success' });
        setCurrent(''); setNext(''); setConfirm('');
      }
    });
  };

  return (
    <Section title="Password" description="Change the password used to sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-pw" className="text-[13px] font-medium text-content-2">Current password</Label>
          <div className="relative">
            <Input
              id="current-pw"
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              className="h-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pw" className="text-[13px] font-medium text-content-2">New password</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowNext(!showNext)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-3 hover:text-content-1 transition-colors"
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-pw" className="text-[13px] font-medium text-content-2">Confirm new password</Label>
          <Input
            id="confirm-pw"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Same password again"
            className="h-10"
            required
            style={confirm && !passwordsMatch ? { borderColor: 'var(--ds-error)' } : {}}
          />
          {confirm && !passwordsMatch && (
            <p className="text-[12px] text-error">Passwords don't match.</p>
          )}
        </div>

        {msg && <StatusMessage message={msg.text} type={msg.type} />}

        <Button type="submit" disabled={!canSubmit || isPending} className="gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </Section>
  );
}

/* ── Profile tab ─────────────────────────────────────────── */

function ProfileTab({ user }: { user: { id?: string; name?: string | null; email?: string | null; role?: string | null; image?: string | null } | null | undefined }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const initial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const shortId = user?.id ? user.id.replace(/-/g, '').slice(-8).toUpperCase() : '—';
  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : null;
  const roleColor: Record<string, { text: string; bg: string; border: string }> = {
    owner:  { text: 'var(--ds-warning)',  bg: 'var(--ds-warning-muted)',  border: 'var(--ds-warning-border)'  },
    admin:  { text: '#60a5fa',            bg: 'rgba(37,99,235,0.08)',     border: 'rgba(37,99,235,0.20)'      },
    editor: { text: 'var(--ds-success)',  bg: 'var(--ds-success-muted)',  border: 'var(--ds-success-border)'  },
    viewer: { text: 'var(--ds-text-2)',   bg: 'var(--ds-base-2)',         border: 'var(--ds-border-subtle)'   },
  };
  const roleStyle = roleColor[user?.role ?? ''] ?? roleColor.viewer;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      await updateProfile(name.trim());
      setMsg({ text: 'Profile updated.', type: 'success' });
      setEditing(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to update profile.', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEditing(false);
    setMsg(null);
  };

  return (
    <div className="space-y-4">
      <Section title="Profile" description="Your display name shown to teammates">
        <div className="space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img
                src={user.image}
                alt={user?.name || ''}
                className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-[22px] font-bold text-white select-none flex-shrink-0"
                style={{ background: 'var(--ds-accent)' }}
              >
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-9 text-[14px]"
                    autoFocus
                    maxLength={60}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                  />
                  <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="h-9 px-3 gap-1.5 shrink-0">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving} className="h-9 px-3 shrink-0">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-content-1 truncate">
                    {user?.name || 'No name set'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="h-6 w-6 flex items-center justify-center rounded text-content-3 hover:text-content-1 hover:bg-base-3 flex-shrink-0 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {!editing && (
                <p className="text-[13px] text-content-3 mt-0.5">{user?.email}</p>
              )}
            </div>
          </div>

          {msg && <StatusMessage message={msg.text} type={msg.type} />}
        </div>
      </Section>

      {/* Account details — read-only */}
      <Section title="Account" description="Your account details and authentication">
        <div className="divide-y divide-border">
          {[
            {
              label: 'Email address',
              value: user?.email || '—',
              note: 'Used for sign-in and account notifications.',
            },
            ...(roleLabel ? [{
              label: 'Role',
              value: null,
              suffix: (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}` }}>
                  <Shield className="h-3 w-3" /> {roleLabel}
                </span>
              ),
            }] : []),
            {
              label: 'Account ID',
              value: shortId,
              mono: true,
              note: 'Provide this when contacting support.',
            },
            {
              label: 'Sign-in methods',
              value: 'Email & password · Google',
              note: 'Manage your password below.',
            },
          ].map(({ label, value, suffix, mono, note }) => (
            <div key={label} className="flex items-start justify-between py-3.5 gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-content-2">{label}</p>
                {value && (
                  <p className={['text-[13px] text-content-3 mt-0.5 truncate', mono ? 'font-mono' : ''].join(' ')}>{value}</p>
                )}
                {note && <p className="text-[11px] text-content-3 mt-0.5">{note}</p>}
              </div>
              {suffix && <div className="flex-shrink-0 mt-0.5">{suffix}</div>}
            </div>
          ))}
        </div>
      </Section>

      <ChangePasswordSection />

      {/* Sign out */}
      <Section title="Session" description="Manage your active session">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-content-2">Signed in as <span className="font-medium">{user?.email}</span></p>
            <p className="text-[12px] text-content-3 mt-0.5">You will be redirected to the sign-in page.</p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 text-[13px] border flex-shrink-0"
            style={{ color: 'var(--ds-error)', borderColor: 'var(--ds-error-border)' }}
            onClick={async () => {
              await authClient.signOut();
              localStorage.removeItem('iq-connection');
              window.location.href = '/sign-in';
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}

/* ── Organization tab ────────────────────────────────────── */

/* ── Org rename helpers — lifetime limit ── */
const RENAME_KEY = 'iq_org_rename_count';
const MAX_RENAMES = 1;

function getRenameCount(): number {
  try { return parseInt(localStorage.getItem(RENAME_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}
function recordRename() {
  try { localStorage.setItem(RENAME_KEY, String(getRenameCount() + 1)); } catch {}
}

function validateOrgName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Name is required.';
  if (t.length < 2) return 'At least 2 characters required.';
  if (t.length > 40) return 'Maximum 40 characters.';
  if (!/^[a-zA-Z0-9\s\-'&.]+$/.test(t))
    return 'Only letters, numbers, spaces, - \' & and . are allowed.';
  return null;
}

function OrgTab({ existingOrg, setExistingOrg }: {
  existingOrg: Record<string, unknown> | null;
  setExistingOrg: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState((existingOrg?.name as string) || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [renamesUsed, setRenamesUsed] = useState(0);

  useEffect(() => { setOrgName((existingOrg?.name as string) || ''); }, [existingOrg]);
  useEffect(() => { if (existingOrg) setRenamesUsed(getRenameCount()); }, [existingOrg]);

  const renamesLeft = MAX_RENAMES - renamesUsed;
  const atLimit = existingOrg && renamesLeft <= 0;
  const validationError = orgName.length > 0 && orgName.trim() !== (existingOrg?.name as string ?? '')
    ? validateOrgName(orgName) : null;
  const charCount = orgName.trim().length;

  const handleSave = async () => {
    setMsg(null);
    if (existingOrg) {
      const err = validateOrgName(orgName);
      if (err) { setMsg({ text: err, type: 'error' }); return; }
      if (renamesLeft <= 0) {
        setMsg({ text: 'Rename limit reached. Contact support to change your organization name.', type: 'error' });
        return;
      }
    } else if (!orgName.trim()) return;

    setSaving(true);
    try {
      if (existingOrg) {
        const result = await updateOrganization(orgName.trim());
        recordRename();
        setRenamesUsed(getRenameCount());
        setMsg({ text: 'Organization name updated.', type: 'success' });
        setEditingName(false);
        setExistingOrg({ ...existingOrg, name: orgName.trim(), slug: result.slug ?? existingOrg.slug });
      } else {
        const data = await createOrganization(orgName.trim());
        try { localStorage.setItem(RENAME_KEY, '0'); } catch {}
        setRenamesUsed(0);
        setExistingOrg({ id: data.org_id, name: data.name, slug: data.slug });
        setMsg({ text: `Organization "${data.name}" created.`, type: 'success' });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to save organization.', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleCancelRename = () => {
    setOrgName((existingOrg?.name as string) || '');
    setEditingName(false);
    setMsg(null);
  };

  return (
    <div className="space-y-4">
      <Section
        title="Organization"
        description={existingOrg ? 'Your workspace identity' : 'Create a shared workspace for your team'}
      >
        <div className="space-y-4">
          {existingOrg ? (
            /* Identity card with inline rename */
            <div
              className="flex items-center gap-3.5 p-4 rounded-xl"
              style={{ background: 'var(--ds-base-2)', border: '1px solid var(--ds-border-subtle)' }}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-[16px] font-bold text-white flex-shrink-0 select-none"
                style={{ background: 'var(--ds-accent)' }}
              >
                {(existingOrg.name as string)?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={orgName}
                        onChange={e => { setOrgName(e.target.value); setMsg(null); }}
                        className="h-9 text-[14px]"
                        autoFocus
                        maxLength={50}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancelRename(); }}
                      />
                      <span className={[
                        'text-[11px] tabular-nums shrink-0',
                        charCount > 40 ? 'text-error' : charCount > 32 ? 'text-warning' : 'text-content-3',
                      ].join(' ')}>{charCount}/40</span>
                    </div>
                    {validationError && (
                      <p className="text-[12px] text-error flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />{validationError}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Button size="sm" onClick={handleSave} disabled={saving || !!validationError || !orgName.trim()} className="h-8 px-3 gap-1.5">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelRename} disabled={saving} className="h-8 px-3">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-content-1 truncate">{existingOrg.name as string}</p>
                      {!atLimit ? (
                        <Tooltip label="Rename organization" side="right">
                          <button
                            type="button"
                            onClick={() => setEditingName(true)}
                            className="h-6 w-6 flex items-center justify-center rounded text-content-3 hover:text-content-1 hover:bg-base-3 flex-shrink-0 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Rename limit reached. Contact support to change." side="right">
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold cursor-default select-none flex-shrink-0"
                            style={{ background: 'var(--ds-base-3)', color: 'var(--ds-text-3)' }}>
                            i
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-[12px] text-content-3 font-mono mt-0.5 truncate">{existingOrg.slug as string}</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Create org form */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name" className="text-[13px] font-medium text-content-2">Organization name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={e => { setOrgName(e.target.value); setMsg(null); }}
                  placeholder="e.g. Acme Corp"
                  className="h-10"
                  maxLength={50}
                />
              </div>
              {msg && <StatusMessage message={msg.text} type={msg.type} />}
              <Button onClick={handleSave} disabled={saving || !orgName.trim()} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create organization
              </Button>
            </div>
          )}

          {msg && editingName === false && existingOrg && <StatusMessage message={msg.text} type={msg.type} />}
        </div>
      </Section>

      {/* Role permissions */}
      <Section title="Role permissions" description="What each member role can do">
        <div className="rounded-xl overflow-hidden border border-border">
          {[
            { role: 'Owner',  desc: 'Full access — change member roles, all admin actions',  color: 'var(--ds-warning)',  bg: 'var(--ds-warning-muted)',  border: 'var(--ds-warning-border)' },
            { role: 'Admin',  desc: 'Invite & remove members, delete connections',           color: '#60a5fa',            bg: 'rgba(37,99,235,0.08)',     border: 'rgba(37,99,235,0.20)'     },
            { role: 'Editor', desc: 'Add, refresh & toggle database connections',            color: 'var(--ds-success)',  bg: 'var(--ds-success-muted)',  border: 'var(--ds-success-border)' },
            { role: 'Viewer', desc: 'Run queries and view history — no structural changes',  color: 'var(--ds-text-2)',   bg: 'var(--ds-base-2)',         border: 'var(--ds-border-subtle)'  },
          ].map(({ role, desc, color, bg, border }, i, arr) => (
            <div
              key={role}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                background: 'var(--ds-base-0)',
                borderBottom: i < arr.length - 1 ? '1px solid var(--ds-border-subtle)' : undefined,
              }}
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold w-[68px] justify-center flex-shrink-0"
                style={{ color, background: bg, border: `1px solid ${border}` }}
              >
                <Shield className="h-3 w-3" />{role}
              </span>
              <span className="text-[13px] text-content-2">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      {existingOrg && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--ds-error-border)' }}
        >
          <div className="px-6 py-4 border-b" style={{ background: 'var(--ds-error-muted)', borderColor: 'var(--ds-error-border)' }}>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ds-error)' }}>Danger zone</h3>
            <p className="mt-0.5 text-[13px] text-content-3">Irreversible actions — proceed with caution</p>
          </div>
          <div className="p-6" style={{ background: 'var(--ds-base-0)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-content-1">Delete organization</p>
                <p className="text-[13px] text-content-3 mt-0.5">
                  Permanently removes the organization, all connections, and member access. This cannot be undone.
                </p>
              </div>
              <Button
                variant="ghost"
                className="flex-shrink-0 text-[13px] font-medium border"
                style={{ color: 'var(--ds-error)', borderColor: 'var(--ds-error-border)', background: 'transparent' }}
                onClick={() => alert('Contact support@intelliquery.ai to delete your organization.')}
              >
                Delete organization
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Team tab ────────────────────────────────────────────── */

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

function TeamTab({ orgSlug }: { orgSlug: string | undefined }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getTeamMembers();
      setMembers(data.members || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCopyInvite = () => {
    if (!orgSlug) {
      setMsg({ text: 'Create an organization first to generate an invite link.', type: 'error' });
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/invite/${orgSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setMsg(null);
    try {
      const data = await inviteTeamMember(inviteEmail.trim(), inviteRole);
      setMsg({ text: data.message, type: 'success' });
      setInviteEmail('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to send invite.', type: 'error' });
    } finally { setInviting(false); }
  };

  const roleColor: Record<string, string> = {
    owner: 'var(--ds-warning)',
    admin: '#60a5fa',
    editor: 'var(--ds-success)',
    viewer: 'var(--ds-text-3)',
  };

  return (
    <div className="space-y-4">
      <Section title="Invite members" description="Send email invitations to collaborate">
        <div className="space-y-4">
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              type="email"
              className="h-10 min-w-0 flex-1"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[120px] h-10 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
              className="h-10 gap-2 shrink-0"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invite
            </Button>
          </div>

          {msg && <StatusMessage message={msg.text} type={msg.type} />}

          <Button variant="outline" size="sm" onClick={handleCopyInvite} className="gap-2 h-9">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Link copied!' : 'Copy invite link'}
          </Button>
        </div>
      </Section>

      <Section
        title="Active members"
        description={members.length > 0 ? `${members.length} member${members.length !== 1 ? 's' : ''}` : undefined}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-content-3" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center gap-2">
            <Users className="h-8 w-8 text-content-3" />
            <p className="text-[14px] font-medium text-content-2">No team members yet</p>
            <p className="text-[13px] text-content-3">Invite colleagues above to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const initial = (m.name?.[0] || m.email[0]).toUpperCase();
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:bg-base-1"
                  style={{ background: 'var(--ds-base-0)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-[13px] font-bold text-white select-none flex-shrink-0"
                      style={{ background: roleColor[m.role] || 'var(--ds-accent)' }}
                    >
                      {initial}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-content-1">{m.name || 'Invite pending'}</p>
                      <p className="text-[12px] text-content-3 font-mono">{m.email}</p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold capitalize rounded-full px-2.5 py-0.5 border"
                    style={{
                      color: roleColor[m.role] || 'var(--ds-text-2)',
                      background: 'var(--ds-base-1)',
                      borderColor: 'var(--ds-border-subtle)',
                    }}
                  >
                    {m.role}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
