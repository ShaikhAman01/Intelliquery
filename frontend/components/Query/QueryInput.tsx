'use client';

import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  TriangleAlert,
} from 'lucide-react';
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

const templates = [
  {
    label: 'Compare retention across cohorts',
    query: 'Compare retention across cohorts',
    icon: TrendingUp,
    color: 'text-emerald-300',
  },
  {
    label: 'Find inactive enterprise users',
    query: 'Find inactive enterprise users',
    icon: Users,
    color: 'text-blue-300',
  },
  {
    label: 'Detect unusual traffic spikes',
    query: 'Detect unusual traffic spikes',
    icon: TriangleAlert,
    color: 'text-violet-300',
  },
];

export const QueryInput = ({
  value,
  onChange,
  onSubmit,
  onTemplateClick,
  isLoading,
  disabled,
  showSuggestions = true,
}: QueryInputProps) => {
  const handleTranscript = (text: string) => {
    const newValue = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(newValue);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101012] transition-all duration-200 focus-within:border-white/[0.12] focus-within:bg-[#151518]">
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.05),transparent_65%)] opacity-50" />
        <div className="relative z-10 flex items-center gap-4 px-5 py-4 md:px-6">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <Sparkles className="h-4.5 w-4.5 text-violet-300" />

            {isLoading && (
              <span className="absolute inset-0 rounded-xl border border-violet-400/20 animate-pulse" />
            )}
          </div>

          <div className="flex-1">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(event) => {
                if (
                  (event.metaKey || event.ctrlKey) &&
                  event.key.toLowerCase() === 'enter'
                ) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask anything about your data..."
              className="w-full border-0 bg-transparent p-0 text-[15px] text-slate-100 outline-none placeholder:text-slate-500 focus:ring-0"
              disabled={disabled || isLoading}
            />

            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              {isLoading ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-violet-300 animate-pulse" />
                  Analyzing query and generating insights...
                </>
              ) : (
                <>
                  Press
                  <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400">
                    ⌘ Enter
                  </span>
                  to execute
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <VoiceInput
              onTranscript={handleTranscript}
              disabled={disabled || isLoading}
            />

            <button
              onClick={onSubmit}
              disabled={disabled || isLoading || !value.trim()}
              className="group/button hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-slate-200 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.08] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
            >
              {isLoading ? (
                <>
                  Thinking
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showSuggestions && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {templates.map(({ label, query, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => onTemplateClick(query)}
              disabled={disabled || isLoading}
              className="group flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#101012] px-3.5 py-2 text-[12px] font-medium text-slate-400 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/[0.1] hover:bg-[#151518] hover:text-slate-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${color}`}
              />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};