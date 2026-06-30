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

interface SidebarProps {
  className?: string;
  activeView: View;
  onViewChange: (view: View) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

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
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  const [activeMenuConnId, setActiveMenuConnId] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
        setActiveMenuConnId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    getConnections().then((data) => setConnections(data)).catch(() => {});
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

  const isSettings = pathname === '/settings';

  const navBtn = (isActive: boolean) => [
    'flex items-center w-full rounded-md text-[13.5px] transition-colors duration-[100ms] select-none',
    collapsed ? 'justify-center h-9 px-0' : 'gap-3 h-9 px-3',
    isActive
      ? 'bg-brand-muted text-brand font-medium'
      : 'text-content-2 hover:bg-base-2 hover:text-content-1',
  ].join(' ');

  return (
    <aside
      ref={sidebarRef}
      className={[
        'hidden lg:flex flex-col h-full flex-shrink-0 border-r border-border',
        'transition-[width] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[60px]' : 'w-[260px]',
        className,
      ].join(' ')}
      style={{ background: 'var(--ds-base-1)' }}
    >

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-border flex-shrink-0 gap-2 overflow-hidden">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-7 w-7 flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'var(--ds-accent)' }}>
              <Database className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14.5px] font-semibold text-content-1 tracking-tight truncate">
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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-2 space-y-5">

        {/* Nav */}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ view, label, Icon }) => {
            const isActive = activeView === view;
            return (
              <Tooltip key={view} label={label} side="right" disabled={!collapsed}>
                <button
                  type="button"
                  onClick={() => onViewChange(view)}
                  className={navBtn(isActive)}
                >
                  <Icon className={['h-4 w-4 flex-shrink-0', isActive ? 'text-brand' : 'text-content-3'].join(' ')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Databases */}
        <div>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-content-3 tracking-wide select-none uppercase">
              Databases
            </p>
          )}
          {collapsed && <div className="h-px bg-border mb-2" />}

          <div className="space-y-0.5">
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

          {/* Add database */}
          <Tooltip label="Add database" side="right" disabled={!collapsed}>
            <Link
              href="/connections/new"
              className={[
                'flex items-center w-full h-9 rounded-md text-[13px] mt-1 transition-colors duration-[100ms]',
                'text-content-3 hover:bg-base-2 hover:text-content-1',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
              ].join(' ')}
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              {!collapsed && <span>Add database</span>}
            </Link>
          </Tooltip>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="border-t border-border flex-shrink-0 px-2 py-2"
        style={{ background: 'var(--ds-base-1)' }}>
        <Tooltip label="Settings" side="right" disabled={!collapsed}>
          <Link href="/settings" className={navBtn(isSettings)}>
            <Settings className={['h-4 w-4 flex-shrink-0', isSettings ? 'text-brand' : 'text-content-3'].join(' ')} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </Tooltip>
      </div>
    </aside>
  );
};
