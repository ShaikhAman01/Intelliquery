'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { getConnections, getHistory, deleteHistory, deleteConnection, toggleConnectionStatus } from '@/lib/api';
import { AddConnectionDialog } from '@/components/Shared/AddConnectionDialog';
import { Button } from '@/components/ui/button';
import {
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';
import { motion, AnimatePresence } from 'motion/react';

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
}: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();
  const { user } = useSession();

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Floating Drop Menu Status Tracking States
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [activeMenuConnId, setActiveMenuConnId] = useState<number | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
        entry.id === id ? { ...entry, user_question: renameValue.trim() } : entry
      )
    );
    setRenamingId(null);
    setOpenMenuId(null);
  }, [renameValue]);

  // Reactive Connection Modifier Core Control Interceptors
  const handleToggleDisable = async (id: number, currentActive: boolean) => {
    try {
      await toggleConnectionStatus(id, !currentActive);
      const updatedData = await getConnections();
      setConnections(updatedData);
      
      if (activeConnectionId === id && currentActive === true) {
        const nextValidNode = updatedData.find((c: any) => c.is_active !== false);
        setActiveConnection(nextValidNode?.id || null);
      }
      setActiveMenuConnId(null);
    } catch (err) {
      console.error("Failed to alter connection context status attributes:", err);
    }
  };

  const handleRemoveConnection = async (id: number) => {
    if (!confirm("Are you sure you want to permanently remove this database connection?")) return;
    try {
      await deleteConnection(id);
      const updatedData = await getConnections();
      setConnections(updatedData);
      
      if (activeConnectionId === id) {
        const nextValidNode = updatedData.find((c: any) => c.is_active !== false);
        setActiveConnection(nextValidNode?.id || null);
      }
      setActiveMenuConnId(null);
    } catch (err) {
      console.error("Failed to safely prune database registry row:", err);
    }
  };

  const filteredEntries = historyEntries.filter((entry) =>
    historySearch.length === 0 ||
    entry.user_question.toLowerCase().includes(historySearch.toLowerCase()) ||
    entry.generated_sql.toLowerCase().includes(historySearch.toLowerCase())
  );

  const sortedEntries = [...filteredEntries]
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    })
    .slice(0, 10);

  return (
    <aside className={`flex flex-col flex-shrink-0 border-r border-white/[0.06] bg-[#09090b] text-[#e5e1e4] h-full transition-all duration-200 ease-in-out ${collapsed ? 'w-[68px]' : 'w-[260px]'} ${className}`}>
      
      <div className={`flex items-center justify-between px-4 py-4 border-b border-white/[0.06] min-h-[61px] ${collapsed ? 'justify-center' : ''}`}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111214] text-white">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight truncate">Intelliquery</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={onToggle}
          type="button"
          className={`h-8 w-8 flex items-center justify-center rounded-xl border border-white/[0.06] bg-[#111214] text-slate-400 hover:text-white transition-colors shrink-0 ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Form Navigation Grid Link Arrays */}
      <nav className="flex-1 min-h-0 space-y-6 px-3 py-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        
        {/* Workspace Block Panel Options */}
        <div className="space-y-1">
          {!collapsed && <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Workspace</h3>}
          <button 
            type="button" 
            onClick={() => onNavigate?.('chart')} 
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-400 hover:bg-[#111214] hover:text-white transition-all w-full ${collapsed ? 'justify-center' : ''}`}
            title="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Dashboard</span>}
          </button>
        </div>

        <div className="space-y-1">
          {!collapsed && <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Management</h3>}
          <Link 
            href="/settings" 
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-400 hover:bg-[#111214] hover:text-white transition-all w-full ${collapsed ? 'justify-center' : ''}`}
            title="Settings"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
        </div>

        <div className="space-y-2">
          {!collapsed ? (
            <>
              <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500">Team History</h3>
              <div className="px-2 relative flex items-center">
                <Search className="absolute left-4 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search history..."
                  className="w-full rounded-xl border border-white/[0.06] bg-[#09090b] pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/[0.12]"
                />
              </div>
            </>
          ) : (
            <div className="w-full border-t border-white/[0.06] my-4" />
          )}

          <div className="space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {!collapsed && (
              historyLoading ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">Loading logs...</div>
              ) : sortedEntries.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">No historical records.</div>
              ) : (
                sortedEntries.map((entry) => {
                  const isPinned = pinnedIds.includes(entry.id);
                  const isRenaming = renamingId === entry.id;

                  return (
                    <div key={entry.id} className="relative group px-1">
                      {isRenaming ? (
                        <div className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#111214] px-3 py-2">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(entry.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="w-full bg-transparent text-xs text-slate-100 outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-slate-400 hover:bg-[#111214] hover:text-white transition-colors group">
                          <button
                            type="button"
                            onClick={() => onReplay?.(entry.user_question, entry.generated_sql)}
                            className="text-xs truncate flex-1 text-left mr-2 font-normal"
                            title={entry.user_question}
                          >
                            {entry.user_question}
                          </button>
                          <div className="flex items-center gap-1">
                            {isPinned && <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === entry.id ? null : entry.id); }}
                              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:bg-white/[0.06] transition-opacity"
                            >
                              ⋮
                            </button>
                          </div>
                        </div>
                      )}

                      {openMenuId === entry.id && (
                        <div className="absolute right-2 top-full z-30 mt-1 w-32 rounded-xl border border-white/[0.08] bg-[#111214] p-1 text-slate-300 shadow-2xl">
                          <button type="button" onClick={() => handleStartRename(entry)} className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-white/[0.04]">Rename</button>
                          <button type="button" onClick={() => handlePin(entry.id)} className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-white/[0.04]">Pin/Unpin</button>
                          <button type="button" onClick={() => handleDeleteHistory(entry.id)} className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg text-red-400 hover:bg-white/[0.04]">Delete</button>
                        </div>
                      )}
                    </div>
                  )
                })
              )
            )}
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-white/[0.06] bg-[#09090b] p-3 space-y-4 shrink-0">
        <div>
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Connections</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4edea3] opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4edea3]" />
                </span>
                <span>Live</span>
              </div>
            </div>
          )}
          
          <div className="space-y-1 relative">
            {connections.map((conn) => {
              const isActive = activeConnectionId === conn.id;
              const isLinkActive = conn.is_active !== false;

              return (
                <div key={conn.id} className="relative group px-1">
                  <div className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left w-full transition-colors relative ${
                    isActive ? 'bg-[#111214] text-white font-medium' : 'text-slate-400 hover:bg-[#111214]/50'
                  } ${collapsed ? 'justify-center' : ''} ${!isLinkActive ? 'opacity-40' : ''}`}>
                    
                    <button
                      type="button"
                      disabled={!isLinkActive && !isActive}
                      onClick={() => isLinkActive && setActiveConnection(conn.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2.5 text-left bg-transparent border-0 p-0 outline-none ${!isLinkActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      title={conn.name + (!isLinkActive ? " (Disabled)" : "")}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${!isLinkActive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : isActive ? 'bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.4)]' : 'bg-slate-600'}`} />
                      {!collapsed && <span className="truncate text-xs">{conn.name}</span>}
                    </button>
                    
                    {!collapsed && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="rounded bg-[#09090b] px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-500 border border-white/[0.04]">
                          {conn.db_type.slice(0, 4)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveMenuConnId(activeMenuConnId === conn.id ? null : conn.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded px-1 text-slate-500 hover:text-white transition-opacity cursor-pointer"
                        >
                          ⋮
                        </button>
                      </div>
                    )}
                  </div>

                  {activeMenuConnId === conn.id && !collapsed && (
                    <div className="absolute right-2 bottom-full z-50 mb-1 w-36 rounded-xl border border-white/[0.08] bg-[#111214] p-1 text-slate-300 shadow-2xl text-xs">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleDisable(conn.id, isLinkActive); }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        {isLinkActive ? "Disable Database" : "Enable Database"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveConnection(conn.id); }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg text-red-400 hover:bg-white/[0.04] transition-colors font-medium cursor-pointer"
                      >
                        Remove Connection
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Connection Dialog Trigger */}
        <div className="w-full pt-0.5">
          <AddConnectionDialog 
            trigger={
              <Button variant="ghost" className={`w-full h-9 border border-white/[0.06] bg-[#0d0e10] text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${collapsed ? 'px-0' : 'px-3'}`}>
                <Plus className="h-3.5 w-3.5" />
                {!collapsed && <span>Add Connection</span>}
              </Button>
            }
          />
        </div>

        {/* Consolidated Profile Account Controls Wrapper Section (Gemini Alignment) */}
        <div className="border-t border-white/[0.04] pt-2.5 space-y-0.5 relative font-sans">
          <Link href="#" className={`flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-[#111214] hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`} title="Documentation">
            <FileText className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Docs</span>}
          </Link>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-slate-400 hover:bg-[#111214] hover:text-white transition-colors w-full text-left relative group ${profileMenuOpen ? 'bg-[#111214] text-white' : ''} ${collapsed ? 'justify-center' : ''}`}
              title={user?.name || user?.email || "Account Menu"}
            >
              <UserCircle className={`h-5 w-5 shrink-0 transition-colors ${profileMenuOpen ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              {!collapsed && (
                <span className="truncate text-sm font-medium flex-1 pr-2">
                  {user?.name || user?.email || 'User Profile'}
                </span>
              )}
            </button>

            {profileMenuOpen && (
              <div 
                className={`absolute z-50 mb-2 w-52 rounded-xl border border-white/[0.08] bg-[#111214] p-1.5 text-slate-300 shadow-2xl text-sm bottom-full left-0 ${collapsed ? 'ml-2' : 'ml-0'}`}
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                {!collapsed && (
                  <div className="px-2.5 py-2 border-b border-white/[0.04] mb-1.5">
                    <p className="text-xs font-bold text-white truncate">{user?.name || 'Workspace Collaborator'}</p>
                    <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">{user?.email}</p>
                  </div>
                )}

                <Link
                  href="/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-left text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>Account Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await authClient.signOut();
                    window.location.href = "/sign-in";
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors font-medium mt-1 border-t border-white/[0.04] pt-2 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};