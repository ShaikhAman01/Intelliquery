'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { getConnections, deleteConnection, toggleConnectionStatus } from '@/lib/api';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Database,
  MessageSquare,
  Compass,
  Bookmark,
  Clock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MoreHorizontal,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';
import { usePathname } from 'next/navigation';

/* ── Types ─────────────────────────────────────────────────── */

type View = 'chat' | 'schema' | 'snippets' | 'history';

interface SidebarProps {
  className?: string;
  activeView: View;
  onViewChange: (view: View) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

/* ── Nav items ──────────────────────────────────────────────── */

const NAV_ITEMS: { view: View; label: string; Icon: React.ElementType }[] = [
  { view: 'chat',     label: 'Chat',           Icon: MessageSquare },
  { view: 'schema',   label: 'Schema Explorer', Icon: Compass       },
  { view: 'snippets', label: 'Saved Queries',   Icon: Bookmark      },
  { view: 'history',  label: 'History',         Icon: Clock         },
];

/* ── Component ──────────────────────────────────────────────── */

export const Sidebar = ({
  className = '',
  activeView,
  onViewChange,
  collapsed = false,
  onToggle,
}: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();
  const { user } = useSession();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  const [activeMenuConnId, setActiveMenuConnId] = useState<number | null>(null);

  /* Close menus on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setActiveMenuConnId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Load connections */
  useEffect(() => {
    getConnections()
      .then((data) => setConnections(data))
      .catch(() => {});
  }, [setConnections]);

  /* Connection handlers */
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

  const handleRemoveConnection = useCallback(async (id: number) => {
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
    } catch {}
  }, [activeConnectionId, setConnections, setActiveConnection]);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Workspace';
  const isSettings = pathname === '/settings';

  return (
    <aside
      ref={sidebarRef}
      className={[
        'hidden lg:flex flex-col h-full flex-shrink-0 border-r border-border',
        'transition-[width] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[72px]' : 'w-[280px]',
        className,
      ].join(' ')}
      style={{ background: 'var(--ds-base-1)' }}
    >

      {/* ── Logo + collapse toggle ────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-border flex-shrink-0 gap-2 overflow-hidden">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-7 w-7 flex items-center justify-center rounded-md bg-brand text-white flex-shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-semibold text-content-1 tracking-tight truncate whitespace-nowrap">
              Intelliquery
            </span>
          </div>
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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">

        {/* Nav */}
        <div className="p-2 pt-3">
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold text-content-3 uppercase tracking-widest select-none">
              Navigation
            </p>
          )}
          <div className="space-y-0.5">
            {NAV_ITEMS.map(({ view, label, Icon }) => {
              const isActive = activeView === view;
              return (
                <Tooltip key={view} label={label} side="right" disabled={!collapsed}>
                  <button
                    type="button"
                    onClick={() => onViewChange(view)}
                    className={[
                      'flex items-center w-full h-[40px] rounded-md text-[14px] transition-colors duration-[100ms] select-none',
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? 'bg-brand-muted text-brand font-medium'
                        : 'text-content-2 hover:bg-base-3 hover:text-content-1',
                    ].join(' ')}
                  >
                    <Icon
                      className={[
                        'h-4 w-4 flex-shrink-0',
                        isActive ? 'text-brand' : 'text-content-3',
                      ].join(' ')}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="px-3 py-1"><div className="h-px bg-border" /></div>

        {/* Databases */}
        <div className="p-2 pt-2">
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold text-content-3 uppercase tracking-widest select-none">
              Databases
            </p>
          )}

          <div className="space-y-0.5">
            {connections.map((conn) => {
              const isSelected = activeConnectionId === conn.id;
              const isEnabled  = conn.is_active !== false;
              const isMenuOpen = activeMenuConnId === conn.id;

              return (
                <div key={conn.id} className="relative group">
                  {collapsed ? (
                    /* ── Collapsed: icon button with status dot overlay ── */
                    <Tooltip label={`${conn.name} · ${conn.db_type.toUpperCase()}`} side="right">
                      <button
                        type="button"
                        disabled={!isEnabled && !isSelected}
                        onClick={() => isEnabled && setActiveConnection(conn.id)}
                        className={[
                          'relative flex items-center justify-center w-full h-[40px] rounded-md transition-colors duration-[100ms] disabled:cursor-not-allowed',
                          isSelected
                            ? 'bg-brand-muted text-brand'
                            : 'text-content-3 hover:bg-base-3 hover:text-content-1',
                          !isEnabled ? 'opacity-40' : '',
                        ].join(' ')}
                      >
                        <Database className="h-4 w-4" />
                        <span
                          className={[
                            'absolute bottom-2 right-2 h-2 w-2 rounded-full border-2',
                            !isEnabled ? 'bg-error' : isSelected ? 'bg-success' : 'bg-base-5',
                          ].join(' ')}
                          style={{ borderColor: 'var(--ds-base-1)' }}
                        />
                      </button>
                    </Tooltip>
                  ) : (
                    /* ── Expanded: full row with name, badge, menu ── */
                    <div
                      className={[
                        'flex items-center h-[40px] rounded-md px-3 gap-2.5 transition-colors duration-[100ms]',
                        isSelected ? 'bg-base-3 text-content-1' : 'text-content-2 hover:bg-base-2 hover:text-content-1',
                        !isEnabled ? 'opacity-40' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        disabled={!isEnabled && !isSelected}
                        onClick={() => isEnabled && setActiveConnection(conn.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                      >
                        <span
                          className={[
                            'h-2 w-2 rounded-full flex-shrink-0',
                            !isEnabled ? 'bg-error' : isSelected ? 'bg-success status-glow' : 'bg-base-5',
                          ].join(' ')}
                        />
                        <span className="text-[13px] truncate">{conn.name}</span>
                      </button>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                        <span className="font-mono text-[10px] uppercase text-content-3 bg-base-0 px-1.5 py-0.5 rounded border border-border select-none">
                          {conn.db_type.slice(0, 4)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuConnId(isMenuOpen ? null : conn.id);
                          }}
                          aria-label="Connection options"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-content-3 hover:text-content-1 transition-all duration-[100ms]"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Connection context menu — expanded only */}
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
                        className="w-full px-3 py-1.5 text-left rounded-md text-error hover:bg-[var(--ds-error-muted)] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Database → wizard page */}
          <Tooltip label="Add database" side="right" disabled={!collapsed}>
            <Link
              href="/connections/new"
              className={[
                'flex items-center w-full h-[40px] rounded-md text-[14px] mt-0.5',
                'text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
              ].join(' ')}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Add database</span>}
            </Link>
          </Tooltip>
        </div>
      </div>

      {/* ── Bottom section ───────────────────────────────────── */}
      <div
        className="border-t border-border flex-shrink-0"
        style={{ background: 'var(--ds-base-1)' }}
      >
        {/* Settings */}
        <div className="p-2">
          <Tooltip label="Settings" side="right" disabled={!collapsed}>
            <Link
              href="/settings"
              className={[
                'flex items-center w-full h-[40px] rounded-md text-[14px] transition-colors duration-[100ms]',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isSettings
                  ? 'bg-brand-muted text-brand font-medium'
                  : 'text-content-2 hover:bg-base-3 hover:text-content-1',
              ].join(' ')}
            >
              <Settings
                className={[
                  'h-4 w-4 flex-shrink-0',
                  isSettings ? 'text-brand' : 'text-content-3',
                ].join(' ')}
              />
              {!collapsed && <span>Settings</span>}
            </Link>
          </Tooltip>
        </div>

        {/* Workspace footer */}
        <div className="px-2 pb-1">
          <Tooltip label={`${displayName} · Personal`} side="right" disabled={!collapsed}>
            <div
              className={[
                'flex items-center rounded-lg px-2 py-2 gap-2.5',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--ds-accent)' }}
              >
                <Database className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-content-1 truncate leading-tight">Personal</p>
                  <p className="text-[12px] text-content-3 truncate font-mono leading-tight mt-0.5">
                    {user?.email ?? 'workspace'}
                  </p>
                </div>
              )}
            </div>
          </Tooltip>
        </div>

        {/* Upgrade CTA */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--ds-accent)' }}
            >
              <Zap className="h-3.5 w-3.5" />
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Copyright */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <p className="text-[11px] text-content-3 text-center">
              © {new Date().getFullYear()} Intelliquery, Inc.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
