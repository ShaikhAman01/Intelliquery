'use client';

import { AuthGuard, useSession } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User, Building2, Users, Shield, Mail, Copy, Check,
  Loader2, AlertCircle, CheckCircle2, XCircle, ArrowLeft,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateProfile,
  getOrganization,
  createOrganization,
  updateOrganization,
  getTeamMembers,
  inviteTeamMember,
  getMyInvites,
  acceptInvite,
  declineInvite,
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
          className="hidden sm:flex w-[200px] flex-shrink-0 flex-col border-r border-border p-4 gap-1"
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
          <div className="max-w-2xl mx-auto space-y-6">

            <PendingInvitesBanner />

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
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Pending invites ─────────────────────────────────────── */

interface Invite {
  id: number;
  org_name: string;
  org_slug: string;
  inviter_name: string;
  inviter_email: string;
  role: string;
  created_at: string | null;
}

function PendingInvitesBanner() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await getMyInvites();
      setInvites(data.invites || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleAccept = async (id: number) => {
    setActionLoading(id); setMsg(null);
    try {
      const data = await acceptInvite(id);
      setMsg({ text: data.message, type: 'success' });
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to accept invite.', type: 'error' });
    } finally { setActionLoading(null); }
  };

  const handleDecline = async (id: number) => {
    setActionLoading(id); setMsg(null);
    try {
      const data = await declineInvite(id);
      setMsg({ text: data.message, type: 'success' });
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to decline invite.', type: 'error' });
    } finally { setActionLoading(null); }
  };

  if (loading || (invites.length === 0 && !msg)) return null;

  return (
    <div className="space-y-2">
      {msg && <StatusMessage message={msg.text} type={msg.type} />}
      {invites.map(invite => (
        <div
          key={invite.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
          style={{
            background: 'var(--ds-base-1)',
            border: '1px solid var(--ds-border-moderate)',
            boxShadow: 'var(--ds-shadow-sm)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg border border-border flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ds-base-0)' }}
            >
              <Mail className="h-4 w-4 text-content-3" />
            </div>
            <div>
              <p className="text-[13px] text-content-1">
                <span className="font-semibold">{invite.inviter_name || invite.inviter_email}</span>
                {' '}invited you to join{' '}
                <span className="font-semibold">{invite.org_name}</span>
              </p>
              <p className="text-[12px] text-content-3 mt-0.5 capitalize">Role: {invite.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-[13px] text-error hover:bg-[var(--ds-error-muted)] hover:text-error"
              onClick={() => handleDecline(invite.id)}
              disabled={actionLoading === invite.id}
            >
              {actionLoading === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Decline
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[13px]"
              onClick={() => handleAccept(invite.id)}
              disabled={actionLoading === invite.id}
            >
              {actionLoading === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Profile tab ─────────────────────────────────────────── */

function ProfileTab({ user }: { user: { id?: string; name?: string | null; email?: string | null } | null | undefined }) {
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const initial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      await updateProfile(name.trim());
      setMsg({ text: 'Profile updated.', type: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to update profile.', type: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Section title="Profile" description="Your personal information">
      <div className="space-y-5">
        {/* Avatar row */}
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-[20px] font-bold text-white select-none flex-shrink-0"
            style={{ background: 'var(--ds-accent)' }}
          >
            {initial}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-content-1">{user?.name || 'No name set'}</p>
            <p className="text-[13px] text-content-3 font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="h-px border-t border-border" />

        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-[13px] font-medium text-content-2">Display name</Label>
            <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-content-2">Email address</Label>
            <Input value={user?.email || ''} disabled className="h-10 font-mono text-[12px]" />
            <p className="text-[12px] text-content-3">Email changes are managed through your auth provider.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-content-2">User ID</Label>
            <Input value={user?.id || ''} disabled className="h-10 font-mono text-[11px]" />
          </div>
        </div>

        {msg && <StatusMessage message={msg.text} type={msg.type} />}

        <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </Section>
  );
}

/* ── Organization tab ────────────────────────────────────── */

function OrgTab({ existingOrg, setExistingOrg }: {
  existingOrg: Record<string, unknown> | null;
  setExistingOrg: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
}) {
  const [orgName, setOrgName] = useState((existingOrg?.name as string) || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { setOrgName((existingOrg?.name as string) || ''); }, [existingOrg]);

  const handleSave = async () => {
    if (!orgName.trim()) return;
    setSaving(true); setMsg(null);
    try {
      if (existingOrg) {
        await updateOrganization(orgName.trim());
        setMsg({ text: 'Organization updated.', type: 'success' });
        setExistingOrg({ ...existingOrg, name: orgName.trim() });
      } else {
        const data = await createOrganization(orgName.trim());
        setExistingOrg({ id: data.org_id, name: data.name, slug: data.slug });
        setMsg({ text: `Organization "${data.name}" created.`, type: 'success' });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMsg({ text: e.response?.data?.detail || 'Failed to save organization.', type: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Organization"
        description={existingOrg ? `Managing "${existingOrg.name as string}"` : 'Create a shared workspace for your team'}
      >
        <div className="space-y-5">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="org-name" className="text-[13px] font-medium text-content-2">Organization name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-10"
              />
            </div>
            {existingOrg && (
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-content-2">Slug</Label>
                <Input value={(existingOrg.slug as string)} disabled className="h-10 font-mono text-[12px]" />
              </div>
            )}
          </div>

          {msg && <StatusMessage message={msg.text} type={msg.type} />}

          <Button onClick={handleSave} disabled={saving || !orgName.trim()} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existingOrg ? 'Update organization' : 'Create organization'}
          </Button>
        </div>
      </Section>

      {/* Roles reference */}
      <Section title="Role permissions" description="Access levels for organization members">
        <div className="space-y-4">
          <p className="text-[13px] text-content-3 leading-relaxed">
            Organizations let you share database connections and query history securely across team members with fine-grained access control.
          </p>
          <div className="space-y-2">
            {[
              { role: 'Owner',  desc: 'Full control — billing, members, all settings',    color: 'var(--ds-warning)',  bg: 'var(--ds-warning-muted)',  border: 'var(--ds-warning-border)' },
              { role: 'Admin',  desc: 'Manage members and connections',                    color: '#60a5fa',            bg: 'rgba(37,99,235,0.08)',     border: 'rgba(37,99,235,0.20)' },
              { role: 'Editor', desc: 'Run queries, save snippets, view all connections', color: 'var(--ds-success)',  bg: 'var(--ds-success-muted)',  border: 'var(--ds-success-border)' },
              { role: 'Viewer', desc: 'Read-only access to shared queries',               color: 'var(--ds-text-2)',   bg: 'transparent',              border: 'var(--ds-border-subtle)' },
            ].map(({ role, desc, color, bg, border }) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-lg border px-3.5 py-2.5"
                style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex-shrink-0 mr-3"
                  style={{ color, background: bg, border: `1px solid ${border}` }}
                >
                  <Shield className="h-3 w-3" />
                  {role}
                </span>
                <span className="text-[13px] text-content-3 flex-1">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
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
