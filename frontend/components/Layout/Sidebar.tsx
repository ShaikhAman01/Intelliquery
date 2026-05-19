'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getConnections } from '@/lib/api';
import { AddConnectionDialog } from '@/components/Shared/AddConnectionDialog';
import {
  CircleHelp,
  Database,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Settings,
  SquareTerminal,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';

import { motion } from 'motion/react';

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className = '' }: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();

  useEffect(() => {
    getConnections().then((data) => setConnections(data)).catch((err) => console.error(err));
  }, [setConnections]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true, href: '/' },
    { label: 'Queries', icon: SquareTerminal, href: '/' },
    { label: 'Databases', icon: Database, href: '/' },
    { label: 'Insights', icon: Lightbulb, href: '/' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  const footerItems = [
    { label: 'Docs', icon: FileText, href: '#' },
    { label: 'Support', icon: CircleHelp, href: '#' },
    { label: 'Profile', icon: UserCircle, href: '#' },
  ];

  return (
    <aside className={`flex flex-col flex-shrink-0 border-r border-white/[0.06] bg-[#0e0e10] text-[#e5e1e4] ${className}`}>
      <div className="px-7 pb-8 pt-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#afc6ff] to-[#571bc1] shadow-[0_12px_30px_rgba(87,27,193,0.35)]">
          <Database className="h-5 w-5 text-[#002d6d]" />
        </div>
        <div className="min-w-0">
          <span className="block text-xl font-bold leading-tight tracking-tight text-[#d9e2ff]">Intelliquery</span>
          <span className="text-xs font-medium tracking-wide text-[#c2c6d7]">AI Data Engine</span>
        </div>
      </div>

      <nav className="px-5">
        <div className="space-y-2">
          {navItems.map(({ label, icon: Icon, active, href }) => (
            <Link
              key={label}
              href={href}
              className={`flex h-14 items-center gap-4 rounded-2xl px-4 text-sm transition-all ${
                active
                  ? 'bg-[#571bc1]/15 text-[#d9e2ff] shadow-[inset_0_0_0_1px_rgba(208,188,255,0.03)]'
                  : 'text-[#c2c6d7] hover:bg-white/[0.04] hover:text-[#e5e1e4]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-auto px-7 pb-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8c90a0]">
          Active Connections
        </div>
        <div className="space-y-2">
          {connections.map((conn, index) => {
            const isActive = activeConnectionId === conn.id;
            return (
              <motion.button
                key={conn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => setActiveConnection(conn.id)}
                className={`group flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors ${
                  isActive ? 'text-[#e5e1e4]' : 'text-[#c2c6d7]/60 hover:bg-white/[0.04] hover:text-[#e5e1e4]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'status-glow bg-[#4edea3]' : 'bg-[#8c90a0]'}`} />
                  <span className="truncate flex-1 text-left">{conn.name}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                  isActive ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-[#afc6ff]/10 text-[#afc6ff]'
                }`}>
                  {conn.db_type.slice(0, 4)}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AddConnectionDialog />

        <div className="mt-8 border-t border-white/[0.06] pt-5">
          {footerItems.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex h-10 items-center gap-3 rounded-lg px-1 text-sm text-[#c2c6d7] transition-colors hover:text-[#e5e1e4]"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};
