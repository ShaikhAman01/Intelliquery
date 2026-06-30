'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  Settings,
  Database,
  Bell,
  ChevronDown,
  LogOut,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Bug,
  Sun,
  Moon,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';
import { useTheme } from '@/components/Providers/ThemeProvider';
import { getOrganization, getMyInvites, acceptInvite, declineInvite } from '@/lib/api';

interface Invite {
  id: number;
  org_name: string;
  inviter_name: string;
  inviter_email: string;
  role: string;
  created_at: string | null;
}

type View = 'chat' | 'schema' | 'snippets' | 'history';

interface HeaderProps {
  activeView?: View;
  onViewChange?: (view: View) => void;
}

export const Header = ({ activeView = 'chat', onViewChange }: HeaderProps) => {
  const { user } = useSession();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [profileOpen, setProfileOpen]   = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [helpOpen, setHelpOpen]         = useState(false);
  const [orgName, setOrgName]           = useState<string | null>(null);
  const [invites, setInvites]           = useState<Invite[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const helpRef    = useRef<HTMLDivElement>(null);

  const avatarInitial = (user?.name || user?.email || 'U')[0].toUpperCase();
  const displayName   = user?.name || user?.email?.split('@')[0] || 'Account';

  useEffect(() => {
    if (!user) return;
    getOrganization().then((data) => setOrgName(data?.org?.name ?? null)).catch(() => {});
    getMyInvites().then((data) => setInvites(data.invites || [])).catch(() => {});
  }, [user]);

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      await acceptInvite(id);
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch {}
    setActionLoading(null);
  };

  const handleDecline = async (id: number) => {
    setActionLoading(id);
    try {
      await declineInvite(id);
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch {}
    setActionLoading(null);
  };

  /* Close all dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeAll = () => {
    setProfileOpen(false);
    setNotifOpen(false);
    setHelpOpen(false);
  };

  /* Dropdown styles */
  const dropdownStyle: React.CSSProperties = {
    background: 'var(--ds-base-0)',
    border: '1px solid var(--ds-border-moderate)',
    boxShadow: 'var(--ds-shadow-lg)',
  };

  const IconBtn = ({
    children,
    label,
    active,
    onClick,
  }: {
    children: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'h-9 w-9 flex items-center justify-center rounded-lg transition-colors duration-[100ms]',
        active
          ? 'bg-base-3 text-content-1'
          : 'text-content-3 hover:bg-base-3 hover:text-content-1',
      ].join(' ')}
    >
      {children}
    </button>
  );

  return (
    <header
      className="flex items-center h-14 px-5 gap-2 flex-shrink-0 border-b border-border"
      style={{ background: 'var(--ds-base-1)' }}
    >
      {/* Mobile: hamburger → Sheet → Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation"
            className="h-9 w-9 flex items-center justify-center rounded-md text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms] lg:hidden flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r border-border"
          style={{ background: 'var(--ds-base-1)' }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Application navigation sidebar</SheetDescription>
          <Sidebar
            className="w-full h-full border-r-0"
            activeView={activeView}
            onViewChange={(v) => { onViewChange?.(v); }}
            collapsed={false}
            alwaysVisible
          />
        </SheetContent>
      </Sheet>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="h-6 w-6 flex items-center justify-center rounded-md bg-brand text-white flex-shrink-0">
          <Database className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-content-1 tracking-tight">Intelliquery</span>
      </div>

<div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">

        {/* Help */}
        <div ref={helpRef} className="relative">
          <IconBtn label="Help" active={helpOpen} onClick={() => { closeAll(); setHelpOpen(!helpOpen); }}>
            <HelpCircle className="h-4 w-4" />
          </IconBtn>
          {helpOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl z-50 overflow-hidden py-1 px-1"
              style={dropdownStyle}
            >
              <p className="px-3 py-1.5 text-[10.5px] font-semibold text-content-3 uppercase tracking-wider">Help & Support</p>
              {[
                { label: 'Documentation', href: '#', Icon: BookOpen },
                { label: 'Contact Support', href: '#', Icon: MessageCircle },
                { label: 'Report a Bug', href: '#', Icon: Bug },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  onClick={closeAll}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-content-2 hover:bg-base-2 hover:text-content-1 transition-colors"
                >
                  <Icon className="h-4 w-4 text-content-3 flex-shrink-0" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <IconBtn label="Notifications" active={notifOpen} onClick={() => { closeAll(); setNotifOpen(!notifOpen); }}>
            <div className="relative">
              <Bell className="h-4 w-4" />
              {invites.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: 'var(--ds-accent)' }}
                  aria-hidden
                >
                  {invites.length}
                </span>
              )}
            </div>
          </IconBtn>
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-80 rounded-xl z-50 overflow-hidden"
              style={dropdownStyle}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-content-1">Notifications</p>
                {invites.length > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'var(--ds-accent)' }}
                  >
                    {invites.length} new
                  </span>
                )}
              </div>

              {invites.length > 0 ? (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {invites.map(invite => (
                    <div key={invite.id} className="px-4 py-3.5">
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <span className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--ds-accent)' }} />
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-content-1 leading-snug">
                            <span className="font-semibold">{invite.inviter_name || invite.inviter_email}</span>
                            {' '}invited you to join{' '}
                            <span className="font-semibold">{invite.org_name}</span>
                          </p>
                          <p className="text-[11px] text-content-3 mt-0.5 capitalize">Role: {invite.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pl-4">
                        <button
                          onClick={() => handleDecline(invite.id)}
                          disabled={actionLoading === invite.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-[12px] border transition-colors disabled:opacity-50"
                          style={{ borderColor: 'var(--ds-border-moderate)', color: 'var(--ds-text-2)' }}
                        >
                          {actionLoading === invite.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <XCircle className="h-3 w-3" />}
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(invite.id)}
                          disabled={actionLoading === invite.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-[12px] text-white transition-colors disabled:opacity-50"
                          style={{ background: 'var(--ds-accent)' }}
                        >
                          {actionLoading === invite.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3" />}
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-content-3 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px] text-content-3">No new notifications</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1" />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={profileOpen}
            onClick={() => { closeAll(); setProfileOpen(!profileOpen); }}
            className={[
              'flex items-center gap-2 px-2 py-1 rounded-lg transition-colors duration-[100ms]',
              profileOpen ? 'bg-base-3' : 'hover:bg-base-3',
            ].join(' ')}
          >
            {/* Avatar */}
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white select-none overflow-hidden"
              style={{ background: 'var(--ds-accent)' }}
            >
              {user?.image
                ? <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
                : avatarInitial
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-semibold text-content-1 leading-tight">{displayName}</p>
              {orgName && <p className="text-[11px] text-content-3 leading-tight truncate max-w-[120px]">{orgName}</p>}
            </div>
            <ChevronDown
              className={[
                'h-3.5 w-3.5 text-content-3 hidden sm:block transition-transform duration-150',
                profileOpen ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-60 rounded-xl z-50 overflow-hidden"
              style={dropdownStyle}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white overflow-hidden"
                    style={{ background: 'var(--ds-accent)' }}
                  >
                    {user?.image
                      ? <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
                      : avatarInitial
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-content-1 truncate">{user?.name || 'Account'}</p>
                    <p className="text-[11px] text-content-3 truncate font-mono">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1 px-1">
                {/* Theme toggle */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg">
                  <span className="text-[13px] text-content-2">
                    {isDark ? 'Dark mode' : 'Light mode'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    aria-label="Toggle theme"
                    className={[
                      'relative h-5 w-9 rounded-full transition-colors duration-200 flex-shrink-0',
                    ].join(' ')}
                    style={{ background: isDark ? 'var(--ds-accent)' : 'var(--ds-base-4)' }}
                  >
                    <span
                      className={[
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center',
                        isDark ? 'translate-x-4' : 'translate-x-0.5',
                      ].join(' ')}
                    >
                      {isDark
                        ? <Moon className="h-2.5 w-2.5 text-[var(--ds-accent)]" />
                        : <Sun className="h-2.5 w-2.5 text-amber-500" />
                      }
                    </span>
                  </button>
                </div>

                <div className="h-px bg-border my-1" />

                <Link
                  href="/settings"
                  onClick={closeAll}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-content-2 hover:bg-base-2 hover:text-content-1 transition-colors"
                >
                  <Settings className="h-4 w-4 text-content-3 flex-shrink-0" />
                  Settings
                </Link>

                <div className="h-px bg-border my-1" />

                <button
                  type="button"
                  onClick={async () => {
                    closeAll();
                    await authClient.signOut();
                    window.location.href = '/sign-in';
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-error hover:bg-[var(--ds-error-muted)] transition-colors"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
