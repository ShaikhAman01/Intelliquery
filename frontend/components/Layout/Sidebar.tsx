'use client';
import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { getConnections, getHistory, deleteHistory } from '@/lib/api';
import { AddConnectionDialog } from '@/components/Shared/AddConnectionDialog';
import {
  Database,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Settings,
  SquareTerminal,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';

import { motion } from 'motion/react';

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
  onNavigate?: (section: 'chart' | 'results' | 'insights' | 'query') => void;
  onReplay?: (question: string, sql: string) => void;

  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({
  className = '',
  onNavigate,
  onReplay,
  collapsed = false,
  onToggle,
}: SidebarProps) => {  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();
  const { user } = useSession();

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  useEffect(() => {
    getConnections().then((data) => setConnections(data)).catch((err) => console.error(err));
  }, [setConnections]);

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

  const handleDeleteHistory = useCallback(async (id: number) => {
    try {
      await deleteHistory(id);
      setHistoryEntries((prev) => prev.filter((entry) => entry.id !== id));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  }, []);

  const handlePin = useCallback((id: number) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    setOpenMenuId(null);
  }, []);

  const handleStartRename = useCallback((entry: HistoryEntry) => {
    setRenamingId(entry.id);
    setRenameValue(entry.user_question);
    setOpenMenuId(null);
  }, []);

  const handleSaveRename = useCallback((id: number) => {
    if (!renameValue.trim()) return;
    setHistoryEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, user_question: renameValue.trim() } : entry,
      ),
    );
    setRenamingId(null);
    setOpenMenuId(null);
  }, [renameValue]);

  const filteredEntries = historyEntries.filter((entry) =>
    historySearch.length === 0 ||
    entry.user_question.toLowerCase().includes(historySearch.toLowerCase()) ||
    entry.generated_sql.toLowerCase().includes(historySearch.toLowerCase()),
  );

  const sortedEntries = [...filteredEntries]
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    })
    .slice(0, 10);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true, section: 'chart' as const },
  ];

  const managementItems = [
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <aside className={`flex flex-col flex-shrink-0 border-r border-white/[0.07] bg-[#0b0b0c]/90 text-[#e5e1e4] backdrop-blur-xl ${className}`}>
      <div className="flex items-center gap-3 px-5 pb-8 pt-6">
        <div className="flex h-7 w-7 items-center justify-center rounded border border-[#d9e2ff]/20 bg-[#d9e2ff]/5">
          <Database className="h-4 w-4 text-[#d9e2ff]" />
        </div>
        <div className="min-w-0">
          <span className="block text-[14px] font-semibold leading-tight tracking-tight text-[#e5e1e4]">Intelliquery</span>
        </div>
      </div>

      <nav className="flex-1 min-h-0 space-y-6 px-4 overflow-hidden">
        <div>
          <h3 className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">Workspace</h3>
          <div className="space-y-1">
          {navItems.map(({ label, icon: Icon, active, section }) => {
            const className = `nav-item flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-300 ${
              active
                ? 'active text-[#d9e2ff]'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-[#e5e1e4]'
            }`;

            if (!section) return null;

            return (
              <button key={label} type="button" onClick={() => onNavigate?.(section)} className={className}>
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[14px] font-medium tracking-tight">{label}</span>
              </button>
            );
          })}
          </div>
        </div>

        <div>
          <h3 className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">Management</h3>
          <div className="space-y-1">
            {managementItems.map(({ label, icon: Icon, href, action }) => {
              const buttonClassName = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-400 transition-all duration-300 hover:bg-white/[0.04] hover:text-[#e5e1e4]";
              if (href) {
                return <Link key={label} href={href} className={buttonClassName}><Icon className="h-[18px] w-[18px]" /><span className="text-[14px] font-medium tracking-tight">{label}</span></Link>;
              }
              if (action === 'openConnections') {
                return (
                  <AddConnectionDialog
                    key={label}
                    trigger={
                      <button type="button" className={buttonClassName}>
                        <Icon className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-medium tracking-tight">{label}</span>
                      </button>
                    }
                  />
                );
              }
              return null;
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">Recent Queries</h3>
          <div className="mb-2 px-3">
            <input
              type="text"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search history..."
              className="w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-[13px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/[0.12]"
            />
          </div>
          <div className="space-y-1 max-h-[320px] min-h-0 overflow-y-auto pr-1">
            {historyLoading ? (
              <div className="px-3 py-2 text-[13px] text-slate-500">Loading history...</div>
            ) : sortedEntries.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-slate-500">No recent queries yet</div>
            ) : (
              sortedEntries.map((entry) => {
                const isPinned = pinnedIds.includes(entry.id);
                const isRenaming = renamingId === entry.id;
                const label = entry.user_question;

                return (
                  <div key={entry.id} className="relative">
                    {isRenaming ? (
                      <div className="group flex w-full items-center justify-between rounded-md border border-white/[0.08] bg-[#131316] px-3 py-2 text-left text-slate-300 transition-all duration-300">
                        <span className="min-w-0 truncate text-[13px]">
                          <input
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                handleSaveRename(entry.id);
                              }
                              if (event.key === 'Escape') {
                                setRenamingId(null);
                              }
                            }}
                            className="w-full bg-transparent text-[13px] text-slate-100 outline-none"
                            autoFocus
                          />
                        </span>
                        <span className="ml-3 flex items-center gap-2 text-[12px] text-slate-500">
                          {isPinned && <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">PINNED</span>}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                            }}
                            className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                          >
                            ⋮
                          </button>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReplay?.(entry.user_question, entry.generated_sql)}
                        className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-slate-300 transition-all duration-300 hover:bg-white/[0.04] hover:text-[#e5e1e4]"
                      >
                        <span className="min-w-0 truncate text-[13px]">
                          <span>{label}</span>
                        </span>
                        <span className="ml-3 flex items-center gap-2 text-[12px] text-slate-500">
                          {isPinned && <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">PINNED</span>}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                            }}
                            className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                          >
                            ⋮
                          </button>
                        </span>
                      </button>
                    )}
                    {openMenuId === entry.id && (
                      <div className="absolute right-3 top-full z-20 mt-1 w-32 rounded-md border border-white/[0.08] bg-[#121214] text-slate-300 shadow-lg">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(entry);
                          }}
                          className="w-full px-3 py-2 text-left text-[13px] hover:bg-white/[0.04]"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePin(entry.id);
                          }}
                          className="w-full px-3 py-2 text-left text-[13px] hover:bg-white/[0.04]"
                        >
                          {isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(entry.id);
                          }}
                          className="w-full px-3 py-2 text-left text-[13px] text-red-400 hover:bg-white/[0.04]"
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
      </nav>

      <div className="mt-2 px-5 pb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">Connections</h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4edea3] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4edea3]" />
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Live</span>
          </div>
        </div>
        <div className="space-y-1">
          {connections.map((conn, index) => {
            const isActive = activeConnectionId === conn.id;
            return (
              <motion.button
                key={conn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => setActiveConnection(conn.id)}
                className={`group flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-all duration-300 ${
                  isActive ? 'text-[#e5e1e4]' : 'text-slate-400 opacity-60 hover:bg-white/[0.04] hover:text-[#e5e1e4] hover:opacity-100'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'status-glow bg-[#4edea3]' : 'bg-[#44474f]'}`} />
                  <span className="truncate text-[13px] font-medium">{conn.name}</span>
                </span>
                <span className="rounded border border-white/[0.06] bg-[#121214] px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                  {conn.db_type.slice(0, 4)}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AddConnectionDialog />

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <Link href="#" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-slate-400 transition-all duration-300 hover:bg-white/[0.04] hover:text-[#e5e1e4]">
            <FileText className="h-[18px] w-[18px]" />
            <span className="text-[14px] font-medium tracking-tight">Docs</span>
          </Link>
          <div className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-slate-400 transition-all duration-300 hover:bg-white/[0.04] hover:text-slate-300">
            <UserCircle className="h-6 w-6 text-slate-500" />
            <span className="truncate text-[14px] font-medium">{user?.name || user?.email || 'Alex Chen'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
