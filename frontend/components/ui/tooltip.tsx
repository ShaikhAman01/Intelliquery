'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
  disabled?: boolean;
}

export function Tooltip({
  label,
  children,
  side = 'right',
  sideOffset = 8,
  delayDuration = 400,
  disabled = false,
}: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          className="z-[9999] max-w-xs whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium leading-none shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          style={{
            background: 'var(--ds-base-5)',
            color: 'var(--ds-text-1)',
            border: '1px solid var(--ds-border-moderate)',
            boxShadow: 'var(--ds-shadow-md)',
          }}
        >
          {label}
          <TooltipPrimitive.Arrow
            className="fill-current"
            style={{ color: 'var(--ds-border-moderate)' }}
            width={8}
            height={4}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
