'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getConnections } from '@/lib/api';
import { AddConnectionDialog } from '@/components/Shared/AddConnectionDialog';
import { Database, LayoutGrid, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import { motion } from 'motion/react';

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className = '' }: SidebarProps) => {
  const { connections, activeConnectionId, setConnections, setActiveConnection } = useStore();

  useEffect(() => {
    getConnections().then((data) => setConnections(data)).catch((err) => console.error(err));
  }, []);

  return (
    <div className={`flex flex-col flex-shrink-0 border-r border-border bg-card/50 ${className}`}>
      <div className="p-6 flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-lg"><Database className="h-5 w-5 text-primary" /></div>
        <span className="font-bold text-lg tracking-tight">Intelliquery</span>
      </div>
      <Separator />
      <ScrollArea className="flex-1 py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">Databases</div>
        <div className="space-y-1 px-2">
          {connections.map((conn, index) => {
            const isActive = activeConnectionId === conn.id;
            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-10 font-normal transition-all hover:scale-[1.02]" onClick={() => setActiveConnection(conn.id)}>
                  <div className="relative flex h-3 w-3 items-center justify-center">
                    {isActive && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`}></span>
                  </div>
                  <span className="truncate flex-1 text-left">{conn.name}</span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal uppercase">{conn.db_type}</Badge>
                </Button>
              </motion.div>
            );
          })}
          <AddConnectionDialog />
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Settings size={16} /> Settings
          </Button>
        </Link>
      </div>
    </div>
  );
};