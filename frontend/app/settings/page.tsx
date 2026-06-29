'use client';

import { AuthGuard, useSession } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User, Building2, Users, Shield, Mail, Copy, Check,
  Loader2, AlertCircle, X, CheckCircle2, XCircle, ArrowLeft,
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

/* ── Inline status alert ──────────────────────────────────────────── */

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-center gap-2.5 text-[13px] px-3 py-2.5 rounded-md ${
        type === 'success' ? 'text-success' : 'text-error'
      }`}
      style={{
        background: type === 'success' ? 'var(--ds-success-muted)' : 'var(--ds-error-muted)',
        border: `1px solid ${type === 'success' ? 'var(--ds-success-border)' : 'var(--ds-error-border)'}`,
      }}
    >
      {type === 'error'
        ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        : <Check className="h-3.5 w-3.5 shrink-0" />
      }
      <span>{message}</span>
    </div>
  );
}

/* ── Page shell ───────────────────────────────────────────────────── */

function SettingsContent() {
  const { user } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    getOrganization()
      .then((data) => { if (data?.org) setOrg(data.org); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-base-0 text-content-1 flex flex-col">

      {/* Top bar */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between border-b border-border bg-base-1 px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="gap-1.5 text-content-3 hover:text-content-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Button>
        <span className="text-[13px] font-semibold text-content-1">Settings</span>
        {/* balance spacer */}
        <div className="w-[148px]" />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 md:px-12">
        <div className="max-w-3xl mx-auto space-y-6">

          <PendingInvitesBanner />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
            {/* Tab bar */}
            <div className="border-b border-border">
              <TabsList>
                <TabsTrigger value="profile" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="organization" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Organization
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Team
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-6">
              <TabsContent value="profile" className="m-0">
                <ProfileTab user={user} />
              </TabsContent>
              <TabsContent value="organization" className="m-0">
                <OrgTab existingOrg={org} setExistingOrg={setOrg} />
              </TabsContent>
              <TabsContent value="team" className="m-0">
                <TeamTab orgSlug={org?.slug} />
              </TabsContent>
            </div>
          </Tabs>

        </div>
      </main>
    </div>
  );
}

/* ── Pending invites banner ───────────────────────────────────────── */

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleAccept = async (inviteId: number) => {
    setActionLoading(inviteId);
    setMsg(null);
    try {
      const data = await acceptInvite(inviteId);
      setMsg({ text: data.message, type: 'success' });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Failed to accept invite.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    setActionLoading(inviteId);
    setMsg(null);
    try {
      const data = await declineInvite(inviteId);
      setMsg({ text: data.message, type: 'success' });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Failed to decline invite.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || invites.length === 0) {
    return msg ? (
      <div className="mb-2">
        <StatusMessage message={msg.text} type={msg.type} />
      </div>
    ) : null;
  }

  return (
    <div className="space-y-2">
      {msg && <StatusMessage message={msg.text} type={msg.type} />}
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--ds-border-moderate)] bg-base-2 px-4 py-3"
          style={{ boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-base-0 border border-border flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-content-3" />
            </div>
            <div className="text-[13px]">
              <p className="text-content-1">
                <span className="font-semibold">{invite.inviter_name || invite.inviter_email}</span>
                {' '}invited you to join{' '}
                <span className="font-semibold">{invite.org_name}</span>
              </p>
              <p className="text-[11px] text-content-3 mt-0.5">
                Role: <span className="capitalize">{invite.role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-error hover:text-error"
              style={{ ['--hover-bg' as string]: 'var(--ds-error-muted)' }}
              onClick={() => handleDecline(invite.id)}
              disabled={actionLoading === invite.id}
            >
              {actionLoading === invite.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <XCircle className="h-3.5 w-3.5" />
              }
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(invite.id)}
              disabled={actionLoading === invite.id}
            >
              {actionLoading === invite.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="h-3.5 w-3.5" />
              }
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Profile tab ──────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile(name.trim());
      setMsg({ text: 'Profile updated successfully.', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border pt-5">
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Your personal info and preferences</CardDescription>
      </CardHeader>
      <CardContent className="pt-5 pb-6 space-y-5">

        {/* Avatar row */}
        <div
          className="flex items-center gap-3 rounded-md bg-base-0 border border-border px-4 py-3"
          style={{ boxShadow: 'var(--ds-shadow-inset)' }}
        >
          <div className="h-10 w-10 rounded-md bg-base-2 border border-border flex items-center justify-center text-[15px] font-bold text-content-1 select-none">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-content-1">{user?.name || 'No name set'}</p>
            <p className="text-[11px] text-content-3 font-mono">{user?.email}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="font-mono text-[12px]" />
            <p className="text-[11px] text-content-3">Email changes are managed through your auth provider</p>
          </div>
          <div className="space-y-1.5">
            <Label>User ID</Label>
            <Input value={user?.id || ''} disabled className="font-mono text-[12px]" />
          </div>

          {msg && <StatusMessage message={msg.text} type={msg.type} />}

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-fit"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Organization tab ─────────────────────────────────────────────── */

function OrgTab({ existingOrg, setExistingOrg }: { existingOrg: any; setExistingOrg: React.Dispatch<any> }) {
  const [orgName, setOrgName] = useState(existingOrg?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { setOrgName(existingOrg?.name || ''); }, [existingOrg]);

  const handleSave = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      if (existingOrg) {
        await updateOrganization(orgName.trim());
        setMsg({ text: 'Organization updated successfully.', type: 'success' });
        setExistingOrg({ ...existingOrg, name: orgName.trim() });
      } else {
        const data = await createOrganization(orgName.trim());
        setExistingOrg({ id: data.org_id, name: data.name, slug: data.slug });
        setMsg({ text: `Organization "${data.name}" created.`, type: 'success' });
      }
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Failed to save organization.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border pt-5">
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          {existingOrg ? `Managing "${existingOrg.name}"` : 'Create a team workspace'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5 pb-6 space-y-5">

        <div className="grid gap-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          {existingOrg && (
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={existingOrg.slug} disabled className="font-mono text-[12px]" />
            </div>
          )}

          {msg && <StatusMessage message={msg.text} type={msg.type} />}

          <Button onClick={handleSave} disabled={saving || !orgName.trim()} className="w-fit">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existingOrg ? 'Update Organization' : 'Create Organization'}
          </Button>
        </div>

        {/* Role reference */}
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-[12px] text-content-3 leading-relaxed max-w-lg">
            Organizations let you share database connections and query history securely with team members. Assign permissions to control access.
          </p>
          <div className="flex gap-2 flex-wrap">
            {[
              { role: 'Owner',  color: 'var(--ds-warning)',  bg: 'var(--ds-warning-muted)',              border: 'var(--ds-warning-border)' },
              { role: 'Admin',  color: '#60a5fa',            bg: 'rgba(37,99,235,0.10)',                 border: 'rgba(37,99,235,0.25)' },
              { role: 'Editor', color: 'var(--ds-success)',  bg: 'var(--ds-success-muted)',              border: 'var(--ds-success-border)' },
              { role: 'Viewer', color: 'var(--ds-text-2)',   bg: 'transparent',                          border: 'var(--ds-border-subtle)' },
            ].map(({ role, color, bg, border }) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ color, background: bg, border: `1px solid ${border}` }}
              >
                <Shield className="h-3 w-3" />
                {role}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Team tab ─────────────────────────────────────────────────────── */

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCopyInvite = () => {
    if (!orgSlug) {
      setMsg({ text: 'Create an organization first to generate a workspace link.', type: 'error' });
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/invite/${orgSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMsg(null);
    try {
      const data = await inviteTeamMember(inviteEmail.trim(), inviteRole);
      setMsg({ text: data.message, type: 'success' });
      setInviteEmail('');
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Failed to send invite.', type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border pt-5">
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Invite and manage access to your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5 pb-6 space-y-6">

        {/* Invite form */}
        <div className="space-y-3">
          <Label>Invite Member</Label>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              type="email"
              className="min-w-0 flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[120px] shrink-0">
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
              className="shrink-0"
            >
              {inviting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Mail className="h-4 w-4" />
              }
              Send Invite
            </Button>
          </div>
          {msg && <StatusMessage message={msg.text} type={msg.type} />}
        </div>

        {/* Copy invite link */}
        <Button variant="outline" size="sm" onClick={handleCopyInvite} className="gap-2">
          {copied
            ? <Check className="h-3.5 w-3.5 text-success" />
            : <Copy className="h-3.5 w-3.5" />
          }
          {copied ? 'Copied to clipboard' : 'Copy invite link'}
        </Button>

        {/* Member roster */}
        <div className="border-t border-border pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-content-2">Active Members</span>
            {members.length > 0 && (
              <span className="font-mono text-[11px] bg-base-0 border border-border text-content-3 px-2 py-0.5 rounded-md">
                {members.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-content-3" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-md border border-dashed border-border text-center bg-base-0">
              <Users className="h-7 w-7 text-content-3 mb-3" />
              <p className="text-[13px] font-medium text-content-2">No team members yet</p>
              <p className="text-[12px] text-content-3 mt-1">Invite colleagues above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-md border border-border bg-base-0 hover:bg-base-1 transition-colors duration-[100ms]"
                  style={{ boxShadow: 'var(--ds-shadow-inset)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-base-2 border border-border flex items-center justify-center text-[13px] font-bold text-content-1 select-none">
                      {m.name?.[0]?.toUpperCase() ?? m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-content-1">{m.name || 'Invite Pending'}</p>
                      <p className="text-[11px] text-content-3 font-mono">{m.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-content-2 capitalize bg-base-2 border border-border px-2.5 py-0.5 rounded-full">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
