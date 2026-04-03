'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  { label: 'Top Customers', query: 'Show me top 10 customers by total spent' },
  { label: 'Sales by Region', query: 'Show sales breakdown by region for last month' },
  { label: 'User Growth', query: 'Show monthly user growth over the past year' },
  { label: 'Product Analytics', query: 'Show top performing products by revenue' },
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Describe Your Query</h2>
        </div>
        <VoiceInput onTranscript={handleTranscript} disabled={disabled || isLoading} />
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative flex-1 min-h-[120px]">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., Show me top customers by revenue... or click the mic to speak"
            className="w-full h-full resize-none bg-card border border-border rounded-lg p-4 
                       text-foreground placeholder:text-muted-foreground 
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                       transition-all duration-200"
            disabled={disabled || isLoading}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={onSubmit}
          disabled={disabled || isLoading || !value.trim()}
          className="w-full h-12 gradient-btn text-white font-medium text-base rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Generate SQL
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>

      {/* Quick Templates */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Templates
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.label}
              onClick={() => onTemplateClick(t.query)}
              disabled={disabled || isLoading}
              className="template-btn px-3 py-2 rounded-lg text-sm text-muted-foreground 
                         hover:text-foreground text-left transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
