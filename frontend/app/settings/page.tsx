'use client';

import { AuthGuard, useSession } from '@/lib/use-auth';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Users, Shield, Mail, Copy, Check, Loader2, AlertCircle, X, CheckCircle2, XCircle } from 'lucide-react';
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

/* ── Toast helper for feedback ──────────────────────────────────────────── */

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error'; }) {
    if (!message) return null;
    return (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-md border ${type === 'success'
            ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/50'
            : 'text-red-400 bg-red-950/20 border-red-900/50'
            }`}>
            {type === 'error' && <AlertCircle className="h-4 w-4" />}
            {type === 'success' && <Check className="h-4 w-4" />}
            <span>{message}</span>
        </div>
    );
}

/* ── Main content ───────────────────────────────────────────────────────── */

function SettingsContent() {
    const { user } = useSession();
    const router = useRouter();

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Settings</h2>
                                <p className="text-muted-foreground">Manage your account and organization</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/')}
                                className="text-muted-foreground hover:text-foreground"
                                title="Close settings"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Pending Invites Banner */}
                        <PendingInvitesBanner />

                        <Tabs defaultValue="profile" className="space-y-6">
                            <TabsList className="bg-muted/50">
                                <TabsTrigger value="profile" className="gap-2">
                                    <User className="h-4 w-4" /> Profile
                                </TabsTrigger>
                                <TabsTrigger value="organization" className="gap-2">
                                    <Building2 className="h-4 w-4" /> Organization
                                </TabsTrigger>
                                <TabsTrigger value="team" className="gap-2">
                                    <Users className="h-4 w-4" /> Team
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile">
                                <ProfileTab user={user} />
                            </TabsContent>
                            <TabsContent value="organization">
                                <OrgTab />
                            </TabsContent>
                            <TabsContent value="team">
                                <TeamTab />
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}

/* ── Pending Invites Banner ─────────────────────────────────────────────── */

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
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    const fetchInvites = useCallback(async () => {
        try {
            const data = await getMyInvites();
            setInvites(data.invites || []);
        } catch {
            // No invites or error
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

    if (loading || invites.length === 0) return msg ? (
        <div className="max-w-3xl">
            <StatusMessage message={msg.text} type={msg.type} />
        </div>
    ) : null;

    return (
        <div className="space-y-3">
            {msg && <StatusMessage message={msg.text} type={msg.type} />}
            {invites.map((invite) => (
                <Card key={invite.id} className="border-primary/30 bg-primary/5">
                    <CardContent className="flex items-center justify-between py-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    <span className="text-primary">{invite.inviter_name || invite.inviter_email}</span>
                                    {' '}invited you to join{' '}
                                    <span className="font-semibold">{invite.org_name}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Role: <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize ml-1">{invite.role}</Badge>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-800/50 hover:bg-red-950/30 hover:text-red-300"
                                onClick={() => handleDecline(invite.id)}
                                disabled={actionLoading === invite.id}
                            >
                                {actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => handleAccept(invite.id)}
                                disabled={actionLoading === invite.id}
                            >
                                {actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                Accept
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/* ── Profile Tab ────────────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: any; }) {
    const [name, setName] = useState(user?.name || '');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setMsg(null);
        try {
            await updateProfile(name.trim());
            setMsg({ text: 'Profile updated successfully!', type: 'success' });
        } catch (err: any) {
            setMsg({ text: err.response?.data?.detail || 'Failed to update profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>Your personal info and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                        {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <p className="font-medium">{user?.name || 'No name set'}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                </div>

                <div className="grid gap-4 max-w-sm">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} disabled className="opacity-60" />
                        <p className="text-xs text-muted-foreground">Email changes are managed through your auth provider</p>
                    </div>
                    <div className="space-y-2">
                        <Label>User ID</Label>
                        <Input value={user?.id || ''} disabled className="opacity-60 font-mono text-xs" />
                    </div>
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                    <Button className="w-fit" onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Organization Tab ───────────────────────────────────────────────────── */

function OrgTab() {
    const [orgName, setOrgName] = useState('');
    const [existingOrg, setExistingOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    const fetchOrg = useCallback(async () => {
        try {
            const data = await getOrganization();
            if (data.org) {
                setExistingOrg(data.org);
                setOrgName(data.org.name);
            }
        } catch {
            // No org yet
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrg(); }, [fetchOrg]);

    const handleSave = async () => {
        if (!orgName.trim()) return;
        setSaving(true);
        setMsg(null);
        try {
            if (existingOrg) {
                await updateOrganization(orgName.trim());
                setMsg({ text: 'Organization updated!', type: 'success' });
            } else {
                const data = await createOrganization(orgName.trim());
                setExistingOrg({ id: data.org_id, name: data.name, slug: data.slug });
                setMsg({ text: `Organization "${data.name}" created!`, type: 'success' });
            }
        } catch (err: any) {
            setMsg({ text: err.response?.data?.detail || 'Failed to save organization.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-border">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>
                    {existingOrg ? `Managing "${existingOrg.name}"` : 'Create a team workspace'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 max-w-sm">
                    <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="My Team" />
                    </div>
                    {existingOrg && (
                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <Input value={existingOrg.slug} disabled className="opacity-60 font-mono text-sm" />
                        </div>
                    )}
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                    <Button className="w-fit" onClick={handleSave} disabled={saving || !orgName.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {existingOrg ? 'Update Organization' : 'Create Organization'}
                    </Button>
                </div>

                <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                        Organizations let you share database connections and query history with your team.
                        Members can be assigned roles to control access.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {['Owner', 'Admin', 'Editor', 'Viewer'].map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" /> {role}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Team Tab ───────────────────────────────────────────────────────────── */

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
}

function TeamTab() {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [copied, setCopied] = useState(false);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    const fetchMembers = useCallback(async () => {
        try {
            const data = await getTeamMembers();
            setMembers(data.members || []);
        } catch {
            // No org or error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(`Join my Intelliquery team: ${window.location.origin}/sign-up`);
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
            setMsg({ text: err.response?.data?.detail || 'Failed to invite member.', type: 'error' });
        } finally {
            setInviting(false);
        }
    };

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Invite and manage your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Invite */}
                <div className="max-w-md space-y-3">
                    <Label>Invite by Email</Label>
                    <div className="flex gap-2">
                        <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="teammate@company.com"
                            type="email"
                            className="flex-1"
                        />
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="px-3 py-2 rounded-md border border-border bg-background text-sm"
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                        </select>
                        <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                            Invite
                        </Button>
                    </div>
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyInvite}>
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied ? 'Copied!' : 'Copy invite link'}
                    </Button>
                </div>

                {/* Members list */}
                <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium mb-3">
                        Current Members {members.length > 0 && `(${members.length})`}
                    </p>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                            No team members yet. Create an organization first, then invite members.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                                            {m.name?.[0]?.toUpperCase() ?? m.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{m.name || m.email}</p>
                                            <p className="text-xs text-muted-foreground">{m.email}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
