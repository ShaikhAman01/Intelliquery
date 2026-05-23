'use client';

import { History, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

type HeaderSection = 'chart' | 'results' | 'insights' | 'explainer';
type NavigationSection = HeaderSection | 'query' | 'schema' | 'snippets';

type HeaderProps = {
  onHistory?: () => void;
  onReplay?: (question: string, sql: string) => void;
  onSectionSelect?: (section: any) => void;
  activeSection?: HeaderSection;
  children?: React.ReactNode;
}

export const Header = ({
  onHistory,
  onReplay,
  onSectionSelect,
  children,
}: HeaderProps) => {

  const handleMobileViewChange = (view: 'query' | 'schema' | 'snippets') => {
    if (onSectionSelect) {
      if (view === 'query') {
        onSectionSelect('query');
      } else {
        onSectionSelect(view);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 flex flex-shrink-0 items-center justify-center px-4 py-5 md:px-8 md:py-6">
      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-3 md:left-8">
        <Sheet>
          <SheetTrigger asChild>
            <button className="-ml-2 mr-1 flex h-9 w-9 items-center justify-center rounded-md text-[#c2c6d7] hover:bg-white/[0.04] hover:text-[#e5e1e4] lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[280px] border-white/10 bg-[#0e0e10] p-0">
            <SheetTitle className="sr-only">Menu Dashboard Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Provides database connection navigation</SheetDescription>
            
            <Sidebar 
              className="w-full h-full border-r-0" 
              activeView="query" 
              onViewChange={handleMobileViewChange} 
              onReplay={onReplay} 
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full max-w-3xl">{children}</div>

      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 md:right-8">
        {onHistory && (
          <div className="hidden items-center gap-2 text-[#c2c6d7] sm:flex">
            <button
              className="rounded-full p-2 transition-colors hover:bg-white/[0.04] hover:text-[#afc6ff]"
              onClick={onHistory}
              title="History"
            >
              <History className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};