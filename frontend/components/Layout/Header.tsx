'use client';

import { Bell, History, LogOut, Menu, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

interface HeaderProps {
  onExecute?: () => void;
  onHistory?: () => void;
  isExecuting?: boolean;
  canExecute?: boolean;
}

export const Header = ({ onExecute, onHistory, isExecuting, canExecute = true }: HeaderProps) => {
  const { user } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/sign-in');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-40 flex h-[72px] flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#131315]/90 px-4 backdrop-blur-xl md:h-[98px] md:px-10">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 mr-1 text-[#c2c6d7] hover:bg-white/[0.04] hover:text-[#e5e1e4] lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[280px] border-white/10 bg-[#0e0e10] p-0">
            <SheetTitle className="sr-only">Menu Dashboard Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Provides database connection navigation</SheetDescription>
            <Sidebar className="w-full h-full border-r-0" />
          </SheetContent>
        </Sheet>

        <nav className="hidden items-center gap-7 md:flex">
          {['Charts', 'Data Grid', 'AI Insights', 'Explainer'].map((item, index) => (
            <button
              key={item}
              className={`pb-3 text-sm font-semibold tracking-wide transition-colors ${
                index === 0
                  ? 'border-b-2 border-[#afc6ff] text-[#afc6ff]'
                  : 'text-[#c2c6d7] hover:text-[#e5e1e4]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-2 text-[#c2c6d7] sm:flex">
          <button className="rounded-full p-2 transition-colors hover:bg-white/[0.04] hover:text-[#afc6ff]" title="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 transition-colors hover:bg-white/[0.04] hover:text-[#afc6ff]"
            onClick={onHistory}
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button className="rounded-full p-2 transition-colors hover:bg-white/[0.04] hover:text-[#afc6ff]" title="Share">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <Button
          onClick={onExecute}
          disabled={!canExecute || isExecuting}
          className="h-10 rounded-xl bg-gradient-to-r from-[#afc6ff] to-[#d0bcff] px-4 text-xs font-bold tracking-widest text-[#002760] shadow-[0_14px_30px_rgba(175,198,255,0.18)] hover:opacity-90 md:px-6"
        >
          {isExecuting ? 'Executing...' : 'Execute Query'}
        </Button>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#353437] text-xs font-semibold text-[#afc6ff]">
                {initials}
              </div>
              <span className="hidden max-w-[160px] truncate text-sm text-[#c2c6d7] xl:inline">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-[#c2c6d7] hover:bg-white/[0.04] hover:text-[#ffb4ab]"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
