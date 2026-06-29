'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/Providers/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={[
        'h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0',
        'text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors duration-[100ms]',
        className,
      ].join(' ')}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  );
}
