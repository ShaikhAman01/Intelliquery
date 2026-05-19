'use client';

import { ArrowUp, Sparkles, TrendingUp, Users, TriangleAlert } from 'lucide-react';
import { VoiceInput } from '@/components/Query/VoiceInput';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateClick: (template: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const templates = [
  { label: 'Show monthly revenue trends', query: 'Show monthly revenue trends', icon: TrendingUp, color: 'text-[#4edea3]' },
  { label: 'Identify top customers by LTV', query: 'Identify top customers by LTV', icon: Users, color: 'text-[#afc6ff]' },
  { label: 'Find churn anomalies in Q3', query: 'Find churn anomalies in Q3', icon: TriangleAlert, color: 'text-[#d0bcff]' },
];

export const QueryInput = ({
  value,
  onChange,
  onSubmit,
  onTemplateClick,
  isLoading,
  disabled
}: QueryInputProps) => {
  const handleTranscript = (text: string) => {
    // Append transcript to existing text, or set it if empty
    const newValue = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(newValue);
  };

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <div className="glass-panel ai-glow-focus relative overflow-hidden rounded-[28px] p-2">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-r from-[#afc6ff]/5 to-[#d0bcff]/5" />
        <div className="relative z-10 flex min-h-[108px] items-start gap-4 p-4 md:min-h-[124px]">
          <Sparkles className="mt-1 h-7 w-7 shrink-0 text-[#afc6ff]" fill="currentColor" />
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask Intelliquery a question about inscribe_prod..."
            className="min-h-[76px] flex-1 resize-none border-0 bg-transparent p-0 pt-1 text-xl font-semibold leading-snug tracking-tight text-[#e5e1e4] outline-none placeholder:text-[#8c90a0]/60 focus:ring-0 md:text-2xl"
            disabled={disabled || isLoading}
          />
          <div className="flex shrink-0 items-center gap-2">
            <VoiceInput onTranscript={handleTranscript} disabled={disabled || isLoading} />
            <button
              onClick={onSubmit}
              disabled={disabled || isLoading || !value.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#353437]/70 text-[#e5e1e4] transition-all hover:bg-[#afc6ff] hover:text-[#002d6d] disabled:cursor-not-allowed disabled:opacity-45"
              title="Execute query"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {templates.map(({ label, query, icon: Icon, color }) => (
          <button
            key={label}
            onClick={() => onTemplateClick(query)}
            disabled={disabled || isLoading}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#353437]/75 px-4 py-2 font-mono text-xs font-medium tracking-wide text-[#e5e1e4] transition-colors hover:bg-[#424754]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className={`h-4 w-4 ${color}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
