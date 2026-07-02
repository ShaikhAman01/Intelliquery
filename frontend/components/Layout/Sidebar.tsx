'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore, type Connection } from '@/lib/store';
import { getConnections, deleteConnection, toggleConnectionStatus, testConnectionById } from '@/lib/api';
import { type Session } from '@/lib/sessions';
import { Tooltip } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Database,
  Compass,
  Bookmark,
  Clock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MoreHorizontal,
  SquarePen,
  Loader2,
  MessageSquare,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function dbBadge(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('postgres') || t.includes('pg')) return 'PG';
  if (t.includes('mysql')) return 'MySQL';
  if (t.includes('sqlite')) return 'SQLite';
  if (t.includes('mssql') || t.includes('sqlserver') || t.includes('sql server')) return 'MSSQL';
  if (t.includes('mongo')) return 'Mongo';
  if (t.includes('bigquery') || t.includes('big query')) return 'BQ';
  if (t.includes('redshift')) return 'RS';
  if (t.includes('snowflake')) return 'SF';
  if (t.includes('oracle')) return 'ORA';
  return t.slice(0, 3).toUpperCase();
}

/* ── Types ─────────────────────────────────────────────────── */

type View = 'chat' | 'schema' | 'snippets' | 'history';

function relativeTime(iso: string | number): string {
  if (!iso) return '';
  const diffMs = Date.now() - (typeof iso === 'number' ? iso : new Date(iso).getTime());
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'yesterday';
  if (d < 7) return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface SidebarProps {
  className?: string;
  activeView: View;
  onViewChange: (view: View) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  alwaysVisible?: boolean;
  onNewChat?: () => void;
  sessions?: Session[];
  onRestoreSession?: (id: string) => void;
  activeSessionId?: string;
}

const TOOL_ITEMS: { view: View; label: string; Icon: React.ElementType }[] = [
  { view: 'schema',   label: 'Schema Explorer', Icon: Compass  },
  { view: 'snippets', label: 'Saved Queries',   Icon: Bookmark },
  { view: 'history',  label: 'History',         Icon: Clock    },
];

/* ── Component ──────────────────────────────────────────────── */

export const Sidebar = ({
  className = '',
  activeView,
  onViewChange,
  collapsed = false,
  onToggle,
  alwaysVisible = false,
  onNewChat,
  sessions = [],
  onRestoreSession,
  activeSessionId,
}: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  const [activeMenuConnId, setActiveMenuConnId] = useState<number | null>(null);
  const [testingConnId, setTestingConnId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, 'ok' | 'fail'>>({});
  const [sessionSearch, setSessionSearch] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
        setActiveMenuConnId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    getConnections().then((data) => {
      setConnections(data);
      const { activeConnectionId: stored, setActiveConnection } = useStore.getState();
      const firstActive = data.find((c: Connection) => c.is_active !== false);
      if (stored) {
        const stillValid = data.find((c: Connection) => c.id === stored && c.is_active !== false);
        if (!stillValid) setActiveConnection(firstActive?.id ?? null);
      } else if (firstActive) {
        setActiveConnection(firstActive.id);
      }
    }).catch(() => {});
  }, [setConnections]);

  const handleToggleDisable = useCallback(async (id: number, currentlyActive: boolean) => {
    try {
      await toggleConnectionStatus(id, !currentlyActive);
      const updated = await getConnections();
      setConnections(updated);
      if (activeConnectionId === id && currentlyActive) {
        const next = updated.find((c: any) => c.is_active !== false);
        setActiveConnection(next?.id ?? null);
      }
      setActiveMenuConnId(null);
    } catch {}
  }, [activeConnectionId, setConnections, setActiveConnection]);

  /* Remove connection — two-step: the menu click opens the confirm dialog */
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  const handleRemoveConnection = useCallback((id: number) => {
    setActiveMenuConnId(null);
    setPendingRemoveId(id);
  }, []);

  const confirmRemoveConnection = useCallback(async () => {
    if (pendingRemoveId === null) return;
    try {
      await deleteConnection(pendingRemoveId);
      const updated = await getConnections();
      setConnections(updated);
      if (activeConnectionId === pendingRemoveId) {
        const next = updated.find((c: any) => c.is_active !== false);
        setActiveConnection(next?.id ?? null);
      }
    } catch {}
  }, [pendingRemoveId, activeConnectionId, setConnections, setActiveConnection]);

  const handleTestConnection = useCallback(async (connId: number) => {
    setTestingConnId(connId);
    setActiveMenuConnId(null);
    try {
      await testConnectionById(connId);
      setTestResults(prev => ({ ...prev, [connId]: 'ok' }));
    } catch {
      setTestResults(prev => ({ ...prev, [connId]: 'fail' }));
    }
    setTestingConnId(null);
    setTimeout(() => setTestResults(prev => { const n = { ...prev }; delete n[connId]; return n; }), 3000);
  }, []);

  const isSettings = pathname === '/settings';
  const isInChat = activeView === 'chat' && !isSettings;

  const toolBtn = (isActive: boolean) => [
    'flex items-center w-full rounded-md text-[13px] transition-colors duration-[100ms] select-none',
    collapsed ? 'justify-center h-9 px-0' : 'gap-2.5 h-9 px-3',
    isActive
      ? 'bg-brand-muted text-brand font-medium'
      : 'text-content-2 hover:bg-base-2 hover:text-content-1',
  ].join(' ');

  return (
    <aside
      ref={sidebarRef}
      className={[
        alwaysVisible ? 'flex' : 'hidden lg:flex',
        'flex-col h-full flex-shrink-0 border-r border-border',
        'transition-[width] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[60px]' : 'w-[260px]',
        className,
      ].join(' ')}
      style={{ background: 'var(--ds-base-1)' }}
    >

      <ConfirmDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => { if (!open) setPendingRemoveId(null); }}
        title="Remove connection?"
        description="This permanently removes the database connection and its cached schema. Saved queries that use it will stop working."
        confirmLabel="Remove connection"
        destructive
        onConfirm={confirmRemoveConnection}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-border flex-shrink-0 gap-2 overflow-hidden">
        {!collapsed && (
          /* Logo — clicking goes to current chat (home) without clearing */
          <button
            type="button"
            onClick={() => onViewChange('chat')}
            className="flex items-center gap-2.5 flex-1 min-w-0 rounded-md hover:opacity-80 transition-opacity"
          >
            <div
              className="h-7 w-7 flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'var(--ds-accent)' }}
            >
              <Database className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14.5px] font-semibold text-content-1 tracking-tight truncate">
              Intelliquery
            </span>
          </button>
        )}
        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={[
              'h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0',
              'text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]',
              collapsed ? 'mx-auto' : 'ml-auto',
            ].join(' ')}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </Tooltip>
      </div>

      {/* ── Scrollable body ───────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-2 flex flex-col gap-1">

        {/* New chat — primary action, slightly accented */}
        {onNewChat && (
          <Tooltip label="New chat" side="right" disabled={!collapsed}>
            <button
              type="button"
              onClick={onNewChat}
              className={[
                'flex items-center w-full rounded-md text-[13px] font-medium transition-colors duration-[100ms] select-none',
                collapsed ? 'justify-center h-9 px-0' : 'gap-2.5 h-9 px-3',
                isInChat
                  ? 'bg-brand-muted text-brand'
                  : 'text-content-1 hover:bg-base-2',
              ].join(' ')}
            >
              <SquarePen className={['h-4 w-4 flex-shrink-0', isInChat ? 'text-brand' : 'text-content-2'].join(' ')} />
              {!collapsed && <span>New chat</span>}
            </button>
          </Tooltip>
        )}

        {/* Divider between action and tools */}
        <div className="h-px bg-border mx-1 my-1" />

        {/* Tools */}
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1 pt-0.5 text-[10.5px] font-semibold text-content-3 tracking-wider uppercase select-none">
              Tools
            </p>
          )}
          {TOOL_ITEMS.map(({ view, label, Icon }) => {
            const isActive = activeView === view;
            return (
              <Tooltip key={view} label={label} side="right" disabled={!collapsed}>
                <button
                  type="button"
                  onClick={() => onViewChange(view)}
                  className={toolBtn(isActive)}
                >
                  <Icon className={['h-4 w-4 flex-shrink-0', isActive ? 'text-brand' : 'text-content-3'].join(' ')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Divider before databases */}
        <div className="h-px bg-border mx-1 my-1" />

        {/* Databases */}
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1 pt-0.5 text-[10.5px] font-semibold text-content-3 tracking-wider uppercase select-none">
              Databases
            </p>
          )}

          {connections.map((conn) => {
            const isSelected = activeConnectionId === conn.id;
            const isEnabled  = conn.is_active !== false;
            const isMenuOpen = activeMenuConnId === conn.id;

            return (
              <div key={conn.id} className="relative group">
                {collapsed ? (
                  <Tooltip label={`${conn.name} · ${dbBadge(conn.db_type)}`} side="right">
                    <button
                      type="button"
                      disabled={!isEnabled && !isSelected}
                      onClick={() => isEnabled && setActiveConnection(conn.id)}
                      className={[
                        'relative flex items-center justify-center w-full h-9 rounded-md transition-colors duration-[100ms] disabled:cursor-not-allowed',
                        isSelected ? 'bg-brand-muted text-brand' : 'text-content-3 hover:bg-base-2 hover:text-content-1',
                        !isEnabled ? 'opacity-40' : '',
                      ].join(' ')}
                    >
                      <Database className="h-3.5 w-3.5" />
                      <span
                        className={[
                          'absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full',
                          !isEnabled ? 'bg-error' : isSelected ? 'bg-success' : 'bg-base-5',
                        ].join(' ')}
                      />
                    </button>
                  </Tooltip>
                ) : (
                  <div
                    className={[
                      'flex items-center h-9 rounded-md px-2.5 gap-2 transition-colors duration-[100ms] cursor-pointer',
                      isSelected ? 'bg-base-3 text-content-1' : 'text-content-2 hover:bg-base-2 hover:text-content-1',
                      !isEnabled ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      disabled={!isEnabled && !isSelected}
                      onClick={() => isEnabled && setActiveConnection(conn.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                    >
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full flex-shrink-0',
                          !isEnabled ? 'bg-error' : isSelected ? 'bg-success status-glow' : 'bg-base-4',
                        ].join(' ')}
                      />
                      <span className="text-[13px] truncate">{conn.name}</span>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                      {testingConnId === conn.id && (
                        <Loader2 className="h-3 w-3 animate-spin text-content-3" />
                      )}
                      {testResults[conn.id] === 'ok' && (
                        <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'var(--ds-success-muted)', color: 'var(--ds-success)' }}>OK</span>
                      )}
                      {testResults[conn.id] === 'fail' && (
                        <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'var(--ds-error-muted)', color: 'var(--ds-error)' }}>FAIL</span>
                      )}
                      <span className="font-mono text-[10px] text-content-3 select-none">
                        {dbBadge(conn.db_type)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveMenuConnId(isMenuOpen ? null : conn.id); }}
                        aria-label="Connection options"
                        className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-content-3 hover:text-content-1 transition-all duration-[100ms]"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {isMenuOpen && !collapsed && (
                  <div
                    className="absolute right-0 bottom-full z-50 mb-1 w-36 rounded-lg p-1 text-[13px]"
                    style={{
                      background: 'var(--ds-base-2)',
                      border: '1px solid var(--ds-border-moderate)',
                      boxShadow: 'var(--ds-shadow-md)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleTestConnection(conn.id)}
                      className="w-full px-3 py-1.5 text-left rounded-md text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors"
                    >
                      Test connection
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDisable(conn.id, isEnabled)}
                      className="w-full px-3 py-1.5 text-left rounded-md text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors"
                    >
                      {isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveConnection(conn.id)}
                      className="w-full px-3 py-1.5 text-left rounded-md text-error hover:bg-[var(--ds-error-muted)] transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add database */}
          <Tooltip label="Add database" side="right" disabled={!collapsed}>
            <Link
              href="/connections/new"
              className={[
                'flex items-center w-full h-9 rounded-md text-[13px] transition-colors duration-[100ms]',
                'text-content-3 hover:bg-base-2 hover:text-content-1',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
              ].join(' ')}
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              {!collapsed && <span>Add database</span>}
            </Link>
          </Tooltip>
        </div>

        {/* Recents — sessions, below everything, above Settings */}
        {sessions.length > 0 && onRestoreSession && (
          <>
            <div className="h-px bg-border mx-1 my-1" />
            <div className="space-y-0.5">
              {!collapsed && (
                <>
                  <p className="px-3 pb-1 pt-0.5 text-[10.5px] font-semibold text-content-3 tracking-wider uppercase select-none">
                    Recents
                  </p>
                  {sessions.length > 4 && (
                    <div className="px-2 pb-1 relative">
                      <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3 w-3 text-content-3 pointer-events-none" />
                      <input
                        type="text"
                        value={sessionSearch}
                        onChange={e => setSessionSearch(e.target.value)}
                        placeholder="Search history…"
                        className="w-full h-7 pl-6 pr-2 rounded-md text-[12px] bg-base-2 text-content-1 placeholder:text-content-3 outline-none border border-transparent focus:border-[var(--ds-border-accent)] transition-colors duration-[100ms]"
                      />
                    </div>
                  )}
                </>
              )}
              {(() => {
                const filtered = sessionSearch.trim()
                  ? sessions.filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()))
                  : sessions;
                if (filtered.length === 0) {
                  return !collapsed ? (
                    <p className="px-3 py-2 text-[12px] text-content-3">No sessions match "{sessionSearch}"</p>
                  ) : null;
                }
                return filtered.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <Tooltip key={session.id} label={session.title} side="right" disabled={!collapsed}>
                      <button
                        type="button"
                        onClick={() => onRestoreSession(session.id)}
                        className={[
                          'flex items-center w-full rounded-md transition-colors duration-[100ms] select-none',
                          collapsed ? 'justify-center h-9 px-0' : 'gap-2.5 px-3 py-2',
                          isActive
                            ? 'bg-base-3 text-content-1'
                            : 'text-content-2 hover:bg-base-2 hover:text-content-1',
                        ].join(' ')}
                      >
                        <MessageSquare className={['h-3.5 w-3.5 flex-shrink-0 shrink-0', isActive ? 'text-brand' : 'text-content-3'].join(' ')} />
                        {!collapsed && (
                          <span className="flex flex-col items-start min-w-0 flex-1">
                            <span className={['truncate text-[12.5px] leading-snug w-full text-left', isActive ? 'font-medium' : ''].join(' ')}>{session.title}</span>
                            <span className="text-[10.5px] text-content-3 leading-tight">
                              {relativeTime(session.updatedAt)}
                              {session.queries.length > 1 && ` · ${session.queries.length} queries`}
                            </span>
                          </span>
                        )}
                      </button>
                    </Tooltip>
                  );
                });
              })()}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="border-t border-border flex-shrink-0 px-2 py-2"
        style={{ background: 'var(--ds-base-1)' }}>
        <Tooltip label="Settings" side="right" disabled={!collapsed}>
          <Link
            href="/settings"
            className={[
              'flex items-center w-full rounded-md text-[13px] transition-colors duration-[100ms] select-none',
              collapsed ? 'justify-center h-9 px-0' : 'gap-2.5 h-9 px-3',
              isSettings
                ? 'bg-brand-muted text-brand font-medium'
                : 'text-content-2 hover:bg-base-2 hover:text-content-1',
            ].join(' ')}
          >
            <Settings className={['h-4 w-4 flex-shrink-0', isSettings ? 'text-brand' : 'text-content-3'].join(' ')} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </Tooltip>
      </div>
    </aside>
  );
};
