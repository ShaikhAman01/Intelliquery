'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Called when the user confirms. Async handlers keep the dialog open with a spinner until they resolve. */
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

/**
 * In-app replacement for window.confirm(). Controlled: the caller owns `open`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={busy ? () => {} : onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            {destructive && <AlertCircle className="h-4 w-4" style={{ color: 'var(--ds-error)' }} />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy} className="h-9 text-[13px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
            className="h-9 gap-1.5 text-[13px]"
            style={destructive ? { background: 'var(--ds-error)', color: 'white' } : undefined}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
