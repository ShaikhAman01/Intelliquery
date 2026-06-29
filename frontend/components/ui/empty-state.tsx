import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Tier 1 / Tier 2 empty state ─────────────────────────────
   size="sm"  → Tier 1: compact, inline within a panel
   size="md"  → Tier 2: section-level, full-panel empty state
   ─────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'sm',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'text-content-3 mb-3',
            size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'
          )}
        />
      )}
      <p
        className={cn(
          'font-medium text-content-2',
          size === 'sm' ? 'text-[13px]' : 'text-base'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'text-content-3 mt-1.5',
            size === 'sm' ? 'text-[12px] max-w-[240px]' : 'text-[13px] max-w-[320px] mt-2'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <div className={cn('mt-4', size === 'md' && 'mt-5')}>
          {action}
        </div>
      )}
    </div>
  );
}

/* ── Tier 3: error state ──────────────────────────────────── */
interface ErrorStateProps {
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ message, retry, className }: ErrorStateProps) {
  return (
    <div
      className={cn('flex items-center gap-2.5 rounded-lg px-4 py-3 text-[13px]', className)}
      style={{
        background: 'var(--ds-error-muted)',
        border: '1px solid var(--ds-error-border)',
      }}
    >
      <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
      <span className="flex-1 text-error">{message}</span>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="text-brand text-[12px] hover:underline flex-shrink-0 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
