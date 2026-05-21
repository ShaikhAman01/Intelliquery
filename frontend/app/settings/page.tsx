'use client';

import { AuthGuard, useSession } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Users, Shield, Mail, Copy, Check, Loader2, AlertCircle, X, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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

/* Status Messages */

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error'; }) {
    if (!message) return null;
    return (
        <div className={`flex items-center gap-2.5 text-sm p-4 rounded-2xl border ${type === 'success'
            ? 'text-emerald-400 bg-[#0d0e10] border-emerald-500/20'
            : 'text-red-400 bg-[#0d0e10] border-red-500/20'
            }`}>
            {type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
            {type === 'success' && <Check className="h-4 w-4 shrink-0" />}
            <span className="font-normal">{message}</span>
        </div>
    );
}

/* ── Main Settings Panel Canvas ─────────────────── */

function SettingsContent() {
    const { user } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("profile");
    const [org, setOrg] = useState<any>(null);

    useEffect(() => {
    getOrganization().then(data => {
        if (data?.org) setOrg(data.org);
    }).catch(() => {});
}, []);

    return (
        <div className="min-h-screen bg-[#09090b] text-[#e5e1e4] flex flex-col relative">
            <main className="relative flex-1 overflow-y-auto px-6 py-10 md:px-12 z-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-5">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-[#e5e1e4]">Settings</h2>
                            <p className="text-sm text-slate-400">Manage your workspace and team settings.</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="h-9 w-9 text-slate-400 hover:text-slate-200 border border-white/[0.06] bg-[#111214] rounded-xl transition-colors"
                            title="Close settings"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <PendingInvitesBanner />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="flex border-b border-white/[0.06] bg-[#0d0e10] p-1 rounded-xl border border-white/[0.04] w-fit">
                            <TabsList className="h-auto bg-transparent p-0 flex items-center gap-2">
                                <TabsTrigger value="profile" className="group relative flex items-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-[#111214] data-[state=active]:text-[#e5e1e4] border border-transparent data-[state=active]:border-white/[0.06]">
                                    <User className="h-4 w-4" />
                                    <span>Profile</span>
                                </TabsTrigger>

                                <TabsTrigger value="organization" className="group relative flex items-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-[#111214] data-[state=active]:text-[#e5e1e4] border border-transparent data-[state=active]:border-white/[0.06]">
                                    <Building2 className="h-4 w-4" />
                                    <span>Organization</span>
                                </TabsTrigger>

                                <TabsTrigger value="team" className="group relative flex items-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-[#111214] data-[state=active]:text-[#e5e1e4] border border-transparent data-[state=active]:border-white/[0.06]">
                                    <Users className="h-4 w-4" />
                                    <span>Team Members</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="profile" className="outline-none m-0">
                            <ProfileTab user={user} />
                        </TabsContent>
                        <TabsContent value="organization" className="outline-none m-0">
                            <OrgTab existingOrg={org} setExistingOrg={setOrg}/>
                        </TabsContent>
                        <TabsContent value="team" className="outline-none m-0">
                            <TeamTab orgSlug={org?.slug} />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}

/*  Pending Invites Banner  */

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
            // Silence catch
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
        <div className="max-w-6xl mb-4">
            <StatusMessage message={msg.text} type={msg.type} />
        </div>
    ) : null;

    return (
        <div className="space-y-3 mb-6">
            {msg && <StatusMessage message={msg.text} type={msg.type} />}
            {invites.map((invite) => (
                <Card key={invite.id} className="border-white/[0.06] bg-[#111214] rounded-2xl">
                    <CardContent className="flex flex-wrap items-center justify-between py-4 px-5 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#0d0e10] border border-white/[0.06] flex items-center justify-center">
                                <Mail className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="space-y-0.5 text-sm">
                                <p className="text-slate-300">
                                    <span className="text-white font-semibold">{invite.inviter_name || invite.inviter_email}</span> invited you to join <span className="text-white font-semibold">{invite.org_name}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    Role: <span className="text-slate-400 capitalize">{invite.role}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 text-sm text-red-400 hover:bg-red-500/10 rounded-xl px-4"
                                onClick={() => handleDecline(invite.id)}
                                disabled={actionLoading === invite.id}
                            >
                                {actionLoading === invite.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                className="h-9 text-sm bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-4"
                                onClick={() => handleAccept(invite.id)}
                                disabled={actionLoading === invite.id}
                            >
                                {actionLoading === invite.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                                Accept
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/* Profile Tab */

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
            setMsg({ text: 'Profile updated successfully.', type: 'success' });
        } catch (err: any) {
            setMsg({ text: err.response?.data?.detail || 'Failed to update profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/[0.06] bg-[#0d0e10] py-5 px-6">
                <CardTitle className="text-base font-semibold text-slate-200">User Profile</CardTitle>
                <CardDescription className="text-sm text-slate-400">Your personal info and preferences</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 bg-[#09090b] p-4 rounded-2xl border border-white/[0.06]">
                    <div className="h-12 w-12 rounded-xl bg-[#0d0e10] border border-white/[0.06] flex items-center justify-center text-base font-bold text-slate-200">
                        {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="space-y-0.5 text-sm">
                        <p className="font-semibold text-slate-200">{user?.name || 'No name set'}</p>
                        <p className="text-slate-400 font-mono text-xs">{user?.email}</p>
                    </div>
                </div>

                <div className="grid gap-5 max-w-md text-sm">
                    <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Display Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-[#09090b] border-white/[0.06] focus:border-slate-400 h-10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Email</Label>
                        <Input value={user?.email || ''} disabled className="bg-[#09090b]/50 border-white/[0.04] text-slate-500 h-10 rounded-xl font-mono text-xs" />
                        <p className="text-xs text-slate-500">Email changes are managed through your auth provider</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">User ID</Label>
                        <Input value={user?.id || ''} disabled className="bg-[#09090b]/50 border-white/[0.04] text-slate-500 h-10 rounded-xl font-mono text-xs" />
                    </div>
                    
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                    
                    <Button className="w-fit h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-5" onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/*  Organization Tab */

function OrgTab({ existingOrg, setExistingOrg }: { existingOrg: any; setExistingOrg: React.Dispatch<any>; }) {
    const [orgName, setOrgName] = useState(existingOrg?.name || '');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    useEffect(() => {
        setOrgName(existingOrg?.name || '');
    }, [existingOrg]);

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

    if (loading) {
        return (
            <Card className="border-white/[0.06] bg-[#111214] h-48 flex items-center justify-center rounded-2xl">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </Card>
        );
    }

    return (
        <Card className="border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/[0.06] bg-[#0d0e10] py-5 px-6">
                <CardTitle className="text-base font-semibold text-slate-200">Organization</CardTitle>
                <CardDescription className="text-sm text-slate-400">
                    {existingOrg ? `Managing "${existingOrg.name}"` : 'Create a team workspace'}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid gap-5 max-w-md text-sm">
                    <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Organization Name</Label>
                        <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" className="bg-[#09090b] border-white/[0.06] focus:border-slate-400 h-10 rounded-xl" />
                    </div>
                    {existingOrg && (
                        <div className="space-y-2">
                            <Label className="text-slate-300 font-medium">Organization Slug</Label>
                            <Input value={existingOrg.slug} disabled className="bg-[#09090b]/50 border-white/[0.04] text-slate-500 h-10 rounded-xl font-mono text-xs" />
                        </div>
                    )}
                    
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                    
                    <Button className="w-fit h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-5" onClick={handleSave} disabled={saving || !orgName.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {existingOrg ? 'Update Organization' : 'Create Organization'}
                    </Button>
                </div>

                <div className="pt-5 border-t border-white/[0.06] text-sm space-y-3">
                    <p className="text-slate-400 leading-relaxed">
                        Organizations let you share database connections and query history securely with team members. 
                        Assign clear workspace permissions to control structural access paths.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {['Owner', 'Admin', 'Editor', 'Viewer'].map((role) => (
                            <Badge key={role} variant="outline" className="text-xs bg-[#09090b] border-white/[0.06] text-slate-300 font-normal px-2.5 py-1 rounded-full">
                                <Shield className="h-3 w-3 mr-1.5 text-slate-400" /> {role}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/*  Team Tab   */

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
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    const fetchMembers = useCallback(async () => {
        try {
            const data = await getTeamMembers();
            setMembers(data.members || []);
        } catch {
            // Error pipeline fallback
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]); 

    const handleCopyInvite = () => {
        if (!orgSlug) {
            setMsg({ text: "Create an organization first to generate a workspace link.", type: "error" });
            return;
        }
        const inviteUrl = `${window.location.origin}/invite/${orgSlug}`;
        navigator.clipboard.writeText(inviteUrl);
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
        <Card className="border-white/[0.06] bg-[#111214] rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/[0.06] bg-[#0d0e10] py-5 px-6">
                <CardTitle className="text-base font-semibold text-slate-200">Team Members</CardTitle>
                <CardDescription className="text-sm text-slate-400">Invite and manage account access configurations for your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                
                {/* Invite Form Action */}
                <div className="max-w-xl space-y-3 text-sm">
                    <Label className="text-slate-300 font-medium">Invite Member</Label>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                        <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            type="email"
                            className="bg-[#09090b] border-white/[0.06] focus:border-slate-400 h-10 rounded-xl"
                        />
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="h-10 px-3 rounded-xl border border-white/[0.06] bg-[#09090b] text-sm text-slate-300 focus:outline-none focus:border-slate-400 cursor-pointer min-w-[120px]"
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                        </select>
                        <Button className="h-10 bg-white hover:bg-slate-200 text-zinc-950 font-semibold rounded-xl px-5 flex items-center gap-2 shrink-0" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            <span>Send Invite</span>
                        </Button>
                    </div>
                    {msg && <StatusMessage message={msg.text} type={msg.type} />}
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-9 border border-white/[0.06] bg-[#0d0e10] text-slate-300 hover:text-white rounded-xl px-4 flex items-center gap-2 text-xs font-normal" onClick={handleCopyInvite}>
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                        <span>{copied ? 'Copied link to clipboard' : 'Copy invite link'}</span>
                    </Button>
                </div>

                {/* Team Roster */}
                <div className="border-t border-white/[0.06] pt-6 text-sm">
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-semibold text-slate-300">Active Members</p>
                        {members.length > 0 && (
                            <span className="text-xs text-slate-500 font-mono bg-[#09090b] px-2 py-0.5 rounded-md border border-white/[0.04]">
                                Count: {members.length}
                            </span>
                        )}
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-white/[0.06] bg-[#09090b]/40 rounded-2xl">
                            <p className="text-slate-500 italic">No team members added yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-[#09090b] transition hover:bg-[#0d0e10]/40">
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-9 w-9 rounded-xl bg-[#0d0e10] border border-white/[0.06] flex items-center justify-center text-sm font-bold text-slate-300">
                                            {m.name?.[0]?.toUpperCase() ?? m.email[0].toUpperCase()}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-semibold text-slate-200">{m.name || 'Invite Pending'}</p>
                                            <p className="text-xs text-slate-500 font-mono">{m.email}</p>
                                        </div>
                                    </div>
                                    
                                    <Badge className="text-xs font-normal bg-[#0d0e10] border border-white/[0.06] text-slate-300 px-3 py-0.5 rounded-full capitalize">
                                        {m.role}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}