'use client';

import { Database, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/use-auth';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export const Header = () => {
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
    <header className="flex-shrink-0 h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2 text-muted-foreground mr-1">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 flex">
            <SheetTitle className="sr-only">Menu Dashboard Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Provides database connection navigation</SheetDescription>
            <Sidebar className="w-full h-full border-r-0" />
          </SheetContent>
        </Sheet>
      
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {initials}
              </div>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
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
