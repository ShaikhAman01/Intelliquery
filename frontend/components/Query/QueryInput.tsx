'use client';

import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/Query/VoiceInput';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateClick: (template: string) => void;
  isLoading: boolean;
  disabled: boolean;
  showSuggestions?: boolean;
}

export const QueryInput = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
}: QueryInputProps) => {
  const handleTranscript = (text: string) => {
    const newValue = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(newValue);
  };

  return (
    <div
      className={[
        'relative overflow-hidden rounded-lg',
        'border transition-[border-color] duration-[100ms]',
        'bg-base-2',
        isLoading
          ? 'border-[var(--ds-border-accent)]'
          : 'border-border focus-within:border-[var(--ds-border-moderate)]',
      ].join(' ')}
      style={{ boxShadow: 'var(--ds-shadow-md)' }}
    >
      {/* Subtle accent glow on loading */}
      {isLoading && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ background: 'radial-gradient(ellipse at top, var(--ds-accent-subtle), transparent 70%)' }}
        />
      )}

      <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
        {/* Icon */}
        <div
          className={[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border',
            'transition-colors duration-[100ms]',
            isLoading
              ? 'border-[var(--ds-border-accent)] bg-brand-muted'
              : 'border-border bg-brand-subtle',
          ].join(' ')}
        >
          <Sparkles className={`h-4 w-4 ${isLoading ? 'text-brand animate-pulse' : 'text-brand'}`} />
        </div>

        {/* Text input */}
        <div className="flex-1 min-w-0">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ask anything about your data…"
            className="w-full bg-transparent p-0 text-[14px] text-content-1 outline-none placeholder:text-content-3 disabled:cursor-not-allowed"
            disabled={disabled || isLoading}
          />
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-content-3">
            {isLoading ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                Generating SQL…
              </>
            ) : (
              <>
                Press
                <kbd className="inline-flex items-center rounded border border-border bg-base-3 px-1.5 py-0.5 font-mono text-[10px] text-content-2">
                  ⌘↵
                </kbd>
                to execute
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <VoiceInput onTranscript={handleTranscript} disabled={disabled || isLoading} />

          <Button
            onClick={onSubmit}
            disabled={disabled || isLoading || !value.trim()}
            size="sm"
            className="hidden sm:flex"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[100ms] group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
