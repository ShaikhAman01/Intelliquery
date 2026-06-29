'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import {
  getConnections,
  getHistory,
  deleteHistory,
  deleteConnection,
  toggleConnectionStatus,
} from '@/lib/api';
import { AddConnectionDialog } from '@/components/Shared/AddConnectionDialog';
import {
  Database,
  LayoutDashboard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  Compass,
  Bookmark,
  MoreHorizontal,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';

/* ── Types ─────────────────────────────────────────────────── */

interface HistoryEntry {
  id: number;
  connection_id: number;
  user_question: string;
  generated_sql: string;
  generation_source: string;
  execution_status: string;
  execution_time_ms: number;
  row_count: number;
  timestamp: string;
}

interface SidebarProps {
  className?: string;
  activeView: 'query' | 'schema' | 'snippets';
  onViewChange: (view: 'query' | 'schema' | 'snippets') => void;
  onReplay?: (question: string, sql: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

/* ── Nav definition ─────────────────────────────────────────── */

const NAV_ITEMS = [
  { view: 'query' as const,    label: 'Query Console',  Icon: LayoutDashboard },
  { view: 'schema' as const,   label: 'Schema Explorer', Icon: Compass },
  { view: 'snippets' as const, label: 'Saved Queries',  Icon: Bookmark },
];

/* ── Component ──────────────────────────────────────────────── */

export const Sidebar = ({
  className = '',
  activeView,
  onViewChange,
  onReplay,
  collapsed = false,
  onToggle,
}: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();
  const { user } = useSession();
  const sidebarRef = useRef<HTMLElement>(null);

  /* ── History state ── */
  const [historyEntries, setHistoryEntries]   = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch]     = useState('');
  const [historyLoading, setHistoryLoading]   = useState(false);

  /* ── Menu state ── */
  const [openMenuId, setOpenMenuId]           = useState<number | null>(null);
  const [activeMenuConnId, setActiveMenuConnId] = useState<number | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  /* ── Rename state ── */
  const [renamingId, setRenamingId]           = useState<number | null>(null);
  const [renameValue, setRenameValue]         = useState('');

  /* ── Pin state ── */
  const [pinnedIds, setPinnedIds]             = useState<number[]>([]);

  /* ── Close all menus on outside click ───────────────────── */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setActiveMenuConnId(null);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  /* ── Load connections on mount ──────────────────────────── */
  useEffect(() => {
    getConnections()
      .then((data) => setConnections(data))
      .catch((err) => console.error('Failed to load connections:', err));
  }, [setConnections]);

  /* ── Load history when active connection changes ─────────── */
  const fetchHistory = useCallback(async () => {
    if (!activeConnectionId) {
      setHistoryEntries([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await getHistory(activeConnectionId, 10, 0);
      setHistoryEntries(res.items || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [activeConnectionId]);

  useEffect(() => {
    fetchHistory();
    setOpenMenuId(null);
    setRenamingId(null);
  }, [activeConnectionId, fetchHistory]);

  /* ── History handlers ───────────────────────────────────── */
  const handleDeleteHistory = useCallback(async (id: number) => {
    try {
      await deleteHistory(id);
      setHistoryEntries((prev) => prev.filter((e) => e.id !== id));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to delete history entry:', err);
    }
  }, []);

  const handlePin = useCallback((id: number) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setOpenMenuId(null);
  }, []);

  const handleStartRename = useCallback((entry: HistoryEntry) => {
    setRenamingId(entry.id);
    setRenameValue(entry.user_question);
    setOpenMenuId(null);
  }, []);

  const handleSaveRename = useCallback(
    (id: number) => {
      if (!renameValue.trim()) return;
      setHistoryEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, user_question: renameValue.trim() } : e
        )
      );
      setRenamingId(null);
    },
    [renameValue]
  );

  /* ── Connection handlers ────────────────────────────────── */
  const handleToggleDisable = async (id: number, currentlyActive: boolean) => {
    try {
      await toggleConnectionStatus(id, !currentlyActive);
      const updated = await getConnections();
      setConnections(updated);
      if (activeConnectionId === id && currentlyActive) {
        const next = updated.find((c: any) => c.is_active !== false);
        setActiveConnection(next?.id ?? null);
      }
      setActiveMenuConnId(null);
    } catch (err) {
      console.error('Failed to update connection status:', err);
    }
  };

  const handleRemoveConnection = async (id: number) => {
    if (!confirm('Permanently remove this database connection?')) return;
    try {
      await deleteConnection(id);
      const updated = await getConnections();
      setConnections(updated);
      if (activeConnectionId === id) {
        const next = updated.find((c: any) => c.is_active !== false);
        setActiveConnection(next?.id ?? null);
      }
      setActiveMenuConnId(null);
    } catch (err) {
      console.error('Failed to remove connection:', err);
    }
  };

  /* ── Filtered / sorted history ──────────────────────────── */
  const filteredEntries = historyEntries
    .filter(
      (e) =>
        !historySearch ||
        e.user_question.toLowerCase().includes(historySearch.toLowerCase()) ||
        e.generated_sql.toLowerCase().includes(historySearch.toLowerCase())
    )
    .sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 1 : 0;
      const bp = pinnedIds.includes(b.id) ? 1 : 0;
      return bp - ap;
    })
    .slice(0, 10);

  /* ── Avatar initial ─────────────────────────────────────── */
  const avatarInitial = (user?.name || user?.email || 'U')[0].toUpperCase();

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <aside
      ref={sidebarRef}
      className={[
        'flex flex-col h-full flex-shrink-0 border-r border-border',
        'transition-[width] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-16' : 'w-[232px]',
        className,
      ].join(' ')}
      style={{ background: 'var(--ds-base-1)' }}
    >

      {/* ── Logo + collapse toggle ────────────────────────── */}
      <div className="flex items-center h-12 px-3 border-b border-border flex-shrink-0 gap-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-6 w-6 flex items-center justify-center rounded-md bg-brand text-white flex-shrink-0">
              <Database className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-content-1 tracking-tight truncate">
              Intelliquery
            </span>
          </div>
        )}
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
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      {/* ── Scrollable body ───────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

        {/* Nav section */}
        <div className="p-2 pt-3">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-content-3 uppercase tracking-wider select-none">
              Workspace
            </p>
          )}
          <div className="space-y-0.5">
            {NAV_ITEMS.map(({ view, label, Icon }) => {
              const isActive = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => onViewChange(view)}
                  title={collapsed ? label : undefined}
                  className={[
                    'flex items-center w-full h-[34px] rounded-md text-[13px] transition-colors duration-[100ms] select-none',
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                    isActive
                      ? 'bg-brand-muted text-brand font-medium shadow-[inset_2px_0_0_var(--ds-accent)]'
                      : 'text-content-2 hover:bg-base-3 hover:text-content-1',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-brand' : 'text-content-3',
                    ].join(' ')}
                  />
                  {!collapsed && <span>{label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="px-3 py-1">
          <div className="h-px bg-border" />
        </div>

        {/* Connections section */}
        <div className="p-2 pt-2">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-content-3 uppercase tracking-wider select-none">
              Connections
            </p>
          )}

          <div className="space-y-0.5">
            {connections.map((conn) => {
              const isSelected  = activeConnectionId === conn.id;
              const isEnabled   = conn.is_active !== false;
              const isMenuOpen  = activeMenuConnId === conn.id;

              return (
                <div key={conn.id} className="relative group">
                  <div
                    className={[
                      'flex items-center h-[34px] rounded-md transition-colors duration-[100ms]',
                      collapsed ? 'justify-center px-0' : 'px-3 gap-2',
                      isSelected
                        ? 'bg-base-4 text-content-1'
                        : 'text-content-2 hover:bg-base-3 hover:text-content-1',
                      !isEnabled ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {/* Clickable area: status dot + name */}
                    <button
                      type="button"
                      disabled={!isEnabled && !isSelected}
                      onClick={() => isEnabled && setActiveConnection(conn.id)}
                      title={conn.name}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                    >
                      {/* Status dot */}
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full flex-shrink-0',
                          !isEnabled
                            ? 'bg-error'
                            : isSelected
                              ? 'bg-success status-glow'
                              : 'bg-base-5',
                        ].join(' ')}
                      />
                      {!collapsed && (
                        <span className="text-[13px] truncate">{conn.name}</span>
                      )}
                    </button>

                    {/* DB type badge + context menu trigger */}
                    {!collapsed && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                        <span className="font-mono text-[9px] uppercase text-content-3 bg-base-0 px-1.5 py-0.5 rounded border border-border select-none">
                          {conn.db_type.slice(0, 4)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuConnId(isMenuOpen ? null : conn.id);
                          }}
                          aria-label="Connection options"
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-content-3 hover:text-content-1 transition-all duration-[100ms]"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Connection context menu */}
                  {isMenuOpen && !collapsed && (
                    <div
                      className="absolute right-0 bottom-full z-50 mb-1 w-40 rounded-lg p-1 text-[13px]"
                      style={{
                        background: 'var(--ds-base-2)',
                        border: '1px solid var(--ds-border-moderate)',
                        boxShadow: 'var(--ds-shadow-md)',
                      }}
                    >
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
                        className="w-full px-3 py-1.5 text-left rounded-md text-error hover:bg-error-muted transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add connection */}
          <div className="mt-0.5">
            <AddConnectionDialog
              trigger={
                <button
                  type="button"
                  title="Add connection"
                  className={[
                    'flex items-center w-full h-[34px] rounded-md text-[13px]',
                    'text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]',
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                  ].join(' ')}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>Add connection</span>}
                </button>
              }
            />
          </div>
        </div>

        {/* Divider + History — hidden when collapsed */}
        {!collapsed && (
          <>
            <div className="px-3 py-1">
              <div className="h-px bg-border" />
            </div>

            <div className="p-2 pt-2 pb-4">
              <p className="px-3 pb-2 text-[11px] font-medium text-content-3 uppercase tracking-wider select-none">
                Recent Queries
              </p>

              {/* Search */}
              <div className="relative px-1 mb-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-3 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search queries..."
                  className={[
                    'w-full h-8 pl-8 pr-3 rounded-md text-[13px] outline-none',
                    'text-content-1 placeholder:text-content-3',
                    'transition-[border-color] duration-[100ms]',
                    'focus:border-[var(--ds-border-accent)]',
                  ].join(' ')}
                  style={{
                    background: 'var(--ds-base-0)',
                    border: '1px solid var(--ds-border-subtle)',
                    boxShadow: 'var(--ds-shadow-inset)',
                  }}
                />
              </div>

              {/* History list */}
              <div className="space-y-0.5">
                {historyLoading ? (
                  <p className="px-3 py-2 text-[12px] text-content-3">Loading...</p>
                ) : filteredEntries.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-content-3">
                    {historySearch ? 'No matching queries.' : 'No queries yet.'}
                  </p>
                ) : (
                  filteredEntries.map((entry) => {
                    const isPinned   = pinnedIds.includes(entry.id);
                    const isRenaming = renamingId === entry.id;
                    const isMenuOpen = openMenuId === entry.id;

                    return (
                      <div key={entry.id} className="relative group">
                        {isRenaming ? (
                          /* Rename input */
                          <div
                            className="flex items-center h-[34px] px-3 rounded-md"
                            style={{
                              background: 'var(--ds-base-2)',
                              border: '1px solid var(--ds-border-moderate)',
                            }}
                          >
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(entry.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="flex-1 bg-transparent text-[13px] text-content-1 outline-none"
                              autoFocus
                            />
                          </div>
                        ) : (
                          /* History row */
                          <div
                            className={[
                              'flex items-center h-[34px] px-3 rounded-md',
                              'transition-colors duration-[100ms]',
                              'hover:bg-base-3',
                              isPinned ? 'bg-base-2' : '',
                            ].join(' ')}
                          >
                            <button
                              type="button"
                              onClick={() => onReplay?.(entry.user_question, entry.generated_sql)}
                              title={entry.user_question}
                              className="flex-1 text-[13px] text-content-2 hover:text-content-1 text-left truncate transition-colors duration-[100ms] min-w-0"
                            >
                              {entry.user_question}
                            </button>

                            <div className="flex items-center gap-1 ml-1.5 flex-shrink-0">
                              {isPinned && (
                                <div className="h-1 w-1 rounded-full bg-brand" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(isMenuOpen ? null : entry.id);
                                }}
                                aria-label="Query options"
                                className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-content-3 hover:text-content-1 transition-all duration-[100ms]"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* History context menu */}
                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-full z-30 mt-1 w-36 rounded-lg p-1 text-[13px]"
                            style={{
                              background: 'var(--ds-base-2)',
                              border: '1px solid var(--ds-border-moderate)',
                              boxShadow: 'var(--ds-shadow-md)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartRename(entry)}
                              className="w-full px-3 py-1.5 text-left rounded-md text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePin(entry.id)}
                              className="w-full px-3 py-1.5 text-left rounded-md text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors"
                            >
                              {isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistory(entry.id)}
                              className="w-full px-3 py-1.5 text-left rounded-md text-error hover:bg-error-muted transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── User profile — pinned to bottom ─────────────────── */}
      <div
        className="border-t border-border p-2 flex-shrink-0 relative"
        style={{ background: 'var(--ds-base-1)' }}
      >
        <button
          type="button"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className={[
            'flex items-center w-full h-9 rounded-md text-[13px]',
            'text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
            profileMenuOpen ? 'bg-base-3 text-content-1' : '',
          ].join(' ')}
        >
          {/* Avatar */}
          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-content-1 select-none"
            style={{ background: 'var(--ds-base-4)' }}
          >
            {avatarInitial}
          </div>

          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate font-medium">
                {user?.name || user?.email}
              </span>
              <Settings className="h-3.5 w-3.5 text-content-3 flex-shrink-0" />
            </>
          )}
        </button>

        {/* Profile dropdown */}
        {profileMenuOpen && (
          <div
            className="absolute bottom-full left-2 right-2 mb-2 rounded-lg p-1.5 z-50"
            style={{
              background: 'var(--ds-base-2)',
              border: '1px solid var(--ds-border-moderate)',
              boxShadow: 'var(--ds-shadow-lg)',
            }}
          >
            {/* User info */}
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-[13px] font-medium text-content-1 truncate">
                {user?.name || 'Account'}
              </p>
              <p className="text-[12px] text-content-3 truncate font-mono mt-0.5">
                {user?.email}
              </p>
            </div>

            <Link
              href="/settings"
              onClick={() => setProfileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-content-2 hover:bg-base-3 hover:text-content-1 transition-colors"
            >
              <Settings className="h-4 w-4 text-content-3 flex-shrink-0" />
              Settings
            </Link>

            <button
              type="button"
              onClick={async () => {
                setProfileMenuOpen(false);
                await authClient.signOut();
                window.location.href = '/sign-in';
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[13px] text-error hover:bg-error-muted transition-colors mt-1 border-t border-border pt-2"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
