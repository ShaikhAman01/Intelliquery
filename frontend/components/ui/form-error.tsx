import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormErrorProps {
  message: string;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      className={cn('flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] text-error', className)}
      style={{
        background: 'var(--ds-error-muted)',
        border: '1px solid var(--ds-error-border)',
      }}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
