'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from 'react';
import { useStore } from '@/lib/store';
import { sendQuery } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { ResultsTable } from '@/components/Chat/ResultsTable';
import { InsightsView } from '@/components/Chat/InsightsView';
import { Button } from '@/components/ui/button';
import {
  Play,
  Sparkles,
  Copy,
  Check,
  Bookmark,
  ChevronDown,
  Loader2,
  ArrowUp,
  Database,
  Zap,
  TrendingUp,
  AlertTriangle,
  X,
  PlusCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';

/* ── Types ──────────────────────────────────────────────────── */

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';

interface ChatMessage {
  id: string;
  userQuery: string;
  sql?: string;
  explanation?: string;
  chartRec?: { chart_type: ChartType; reason?: string };
  data?: Record<string, unknown>[];
  executionTime?: number;
  status: 'thinking' | 'ready' | 'error';
  errorMessage?: string;
  // UI state
  runExpanded: boolean;
  insightsExpanded: boolean;
  saveOpen: boolean;
  snippetTitle: string;
  copied: boolean;
}

/* ── Thinking dots ──────────────────────────────────────────── */

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--ds-accent)' }}
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

/* ── SQL inline block ───────────────────────────────────────── */

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','ON','AND','OR',
  'NOT','IN','IS','NULL','AS','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET',
  'CASE','WHEN','THEN','ELSE','END','DISTINCT','UNION','ALL','INSERT','INTO',
  'VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','WITH',
  'RETURNING','OVER','PARTITION','ROWS','BETWEEN','EXISTS','FULL','CROSS',
]);

function highlightSQL(sql: string) {
  return sql.split('\n').map((line, li) => {
    const tokens = line.split(/(\s+|,|\(|\)|\.)/g);
    return (
      <div key={li} className="leading-6">
        {tokens.map((token, ti) => {
          if (SQL_KEYWORDS.has(token.toUpperCase()))
            return <span key={ti} className="sql-keyword">{token}</span>;
          if (/^'[^']*'$/.test(token))
            return <span key={ti} className="sql-string">{token}</span>;
          if (/^"[^"]*"$/.test(token))
            return <span key={ti} className="sql-identifier">{token}</span>;
          if (/^\d+(\.\d+)?$/.test(token))
            return <span key={ti} className="sql-number">{token}</span>;
          return token;
        })}
      </div>
    );
  });
}

/* ── Individual message ─────────────────────────────────────── */

interface MessageProps {
  msg: ChatMessage;
  onUpdate: (id: string, patch: Partial<ChatMessage>) => void;
  onSaveSnippet: (id: string) => void;
  connectionId: number | null;
}

function Message({ msg, onUpdate, onSaveSnippet }: MessageProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!msg.sql) return;
    await navigator.clipboard.writeText(msg.sql);
    onUpdate(msg.id, { copied: true });
    toast('SQL copied to clipboard', 'success');
    setTimeout(() => onUpdate(msg.id, { copied: false }), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
      className="space-y-3"
    >
      {/* User message */}
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm px-5 py-3 text-[15px] leading-relaxed text-white"
          style={{ background: 'var(--ds-accent)' }}
        >
          {msg.userQuery}
        </div>
      </div>

      {/* AI message */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'var(--ds-base-3)', border: '1px solid var(--ds-border-subtle)' }}
        >
          <Sparkles className="h-3.5 w-3.5 text-brand" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Thinking state */}
          {msg.status === 'thinking' && (
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 inline-block"
              style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
            >
              <ThinkingDots />
            </div>
          )}

          {/* Error state */}
          {msg.status === 'error' && (
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-error flex items-start gap-2"
              style={{ background: 'var(--ds-error-muted)', border: '1px solid var(--ds-error-border)' }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {msg.errorMessage || 'Something went wrong. Please try again.'}
            </div>
          )}

          {/* Ready state */}
          {msg.status === 'ready' && msg.sql && (
            <>
              {/* Intro text */}
              {msg.explanation && (
                <p className="text-[15px] text-content-2 leading-relaxed">
                  <span className="text-brand font-semibold">✦</span>{' '}
                  {msg.explanation}
                </p>
              )}

              {/* SQL block */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--ds-base-1)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2 border-b border-border"
                  style={{ background: 'var(--ds-base-2)' }}
                >
                  <span className="text-[11px] font-mono font-semibold text-content-3 uppercase tracking-wider">
                    SQL
                  </span>
                  <button
                    onClick={handleCopy}
                    className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                  >
                    {msg.copied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {msg.copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="px-4 py-3 overflow-x-auto custom-scrollbar">
                  <code className="font-mono text-[12px] text-content-code">
                    {highlightSQL(msg.sql)}
                  </code>
                </pre>
              </div>

              {/* Action row */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onUpdate(msg.id, { runExpanded: !msg.runExpanded, insightsExpanded: false })}
                  className="h-9 gap-1.5 text-[13px] font-medium px-4"
                >
                  <Play className="h-4 w-4" />
                  {msg.runExpanded ? 'Hide Results' : 'Run'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdate(msg.id, { insightsExpanded: !msg.insightsExpanded, runExpanded: false })}
                  className="h-9 gap-1.5 text-[13px] font-medium px-4"
                >
                  <Sparkles className="h-4 w-4" />
                  {msg.insightsExpanded ? 'Hide Insights' : 'Create Insights'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdate(msg.id, { saveOpen: !msg.saveOpen })}
                  className="h-9 gap-1.5 text-[13px] font-medium px-4"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-9 gap-1.5 text-[13px] font-medium px-4"
                >
                  {msg.copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {msg.copied ? 'Copied!' : 'Copy SQL'}
                </Button>
              </div>

              {/* Save snippet inline form */}
              <AnimatePresence>
                {msg.saveOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
                    >
                      <Bookmark className="h-4 w-4 text-content-3 flex-shrink-0" />
                      <input
                        type="text"
                        value={msg.snippetTitle}
                        onChange={(e) => onUpdate(msg.id, { snippetTitle: e.target.value })}
                        placeholder="Name this snippet…"
                        className="flex-1 bg-transparent text-[13px] text-content-1 placeholder:text-content-3 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveSnippet(msg.id);
                          if (e.key === 'Escape') onUpdate(msg.id, { saveOpen: false, snippetTitle: '' });
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => onSaveSnippet(msg.id)}
                        disabled={!msg.snippetTitle.trim()}
                        className="h-7 px-3 text-[12px]"
                      >
                        Save
                      </Button>
                      <button
                        onClick={() => onUpdate(msg.id, { saveOpen: false, snippetTitle: '' })}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Run results */}
              <AnimatePresence>
                {msg.runExpanded && msg.data && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <ResultsTable data={msg.data} executionTime={msg.executionTime} />
                  </motion.div>
                )}
                {msg.runExpanded && msg.data?.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-base-1 px-5 py-6 text-center text-[13px] text-content-3"
                  >
                    Query returned 0 rows.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Insights */}
              <AnimatePresence>
                {msg.insightsExpanded && msg.data && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <InsightsView
                      sql={msg.sql!}
                      explanation={msg.explanation ?? ''}
                      data={msg.data}
                      chartRec={msg.chartRec}
                      executionTime={msg.executionTime}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Welcome screen ─────────────────────────────────────────── */

const SUGGESTIONS = [
  { label: 'Show top 10 customers by revenue', icon: TrendingUp },
  { label: 'Find anomalies in the transactions', icon: AlertTriangle },
  { label: 'Compare sales across regions this month', icon: Zap },
];

function WelcomeScreen({
  onSelect,
  hasConnection,
}: {
  onSelect: (text: string) => void;
  hasConnection: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-4 text-center">
      <div>
        <div
          className="mx-auto mb-6 h-20 w-20 rounded-[22px] flex items-center justify-center"
          style={{ background: 'var(--ds-accent)' }}
        >
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-[32px] font-bold text-content-1 tracking-tight">
          What would you like to explore?
        </h1>
        <p className="mt-3 text-[16px] text-content-3 max-w-md mx-auto leading-relaxed">
          Ask a question in plain English and Intelliquery will generate the SQL and analyze your data.
        </p>
      </div>

      {!hasConnection ? (
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border border-border px-10 py-8"
          style={{ background: 'var(--ds-base-1)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <Database className="h-10 w-10 text-content-3" />
          <div>
            <p className="font-semibold text-content-1 text-[16px]">No database connected</p>
            <p className="mt-1 text-[14px] text-content-3">Connect a database to start querying</p>
          </div>
          <Link href="/connections/new">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-3.5 w-3.5" />
              Add Database
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xl">
          {SUGGESTIONS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className="flex items-center gap-4 text-left w-full rounded-xl border border-border px-5 py-4 text-[15px] text-content-2 hover:text-content-1 hover:border-[var(--ds-border-moderate)] hover:bg-base-1 transition-[background-color,border-color,color] duration-[100ms]"
              style={{ boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Icon className="h-5 w-5 text-brand flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ChatInterface ─────────────────────────────────────── */

export function ChatInterface() {
  const { connections, activeConnectionId, setActiveConnection } = useStore();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionSelectorOpen, setConnectionSelectorOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const connSelectorRef = useRef<HTMLDivElement>(null);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  /* Auto-resize textarea */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Close connection selector on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (connSelectorRef.current && !connSelectorRef.current.contains(e.target as Node)) {
        setConnectionSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Update a message by id */
  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  /* Save snippet */
  const handleSaveSnippet = useCallback(
    async (id: string) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg?.sql || !msg.snippetTitle.trim() || !activeConnectionId) return;
      try {
        const { api } = await import('@/lib/api');
        await api.post('/snippets/', {
          connection_id: activeConnectionId,
          title: msg.snippetTitle.trim(),
          sql_text: msg.sql,
        });
        toast('Snippet saved!', 'success');
        updateMessage(id, { saveOpen: false, snippetTitle: '' });
      } catch {
        toast('Failed to save snippet.', 'error');
      }
    },
    [messages, activeConnectionId, toast, updateMessage]
  );

  /* Submit */
  const handleSubmit = useCallback(async () => {
    const query = input.trim();
    if (!query || isSubmitting) return;
    if (!activeConnectionId) {
      toast('Select a database connection first.', 'error');
      return;
    }

    const id = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        userQuery: query,
        status: 'thinking',
        runExpanded: false,
        insightsExpanded: false,
        saveOpen: false,
        snippetTitle: '',
        copied: false,
      },
    ]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsSubmitting(true);

    try {
      const result = await sendQuery(query, activeConnectionId);
      updateMessage(id, {
        sql: result.sql || '',
        explanation: result.explanation || '',
        data: result.data || [],
        chartRec: result.chart_recommendation,
        executionTime: result.execution_time_ms,
        status: 'ready',
      });
    } catch (err: unknown) {
      let detail = 'Something went wrong. Please try again.';
      if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>;
        const res = e.response as Record<string, unknown> | undefined;
        const resData = res?.data as Record<string, unknown> | undefined;
        if (typeof resData?.detail === 'string') detail = resData.detail;
        else if (e instanceof Error) detail = (e as Error).message;
      }
      updateMessage(id, { status: 'error', errorMessage: detail });
    } finally {
      setIsSubmitting(false);
    }
  }, [input, isSubmitting, activeConnectionId, toast, updateMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const hasConnection = !!activeConnectionId && activeConnection?.is_active !== false;

  return (
    <div className="flex flex-col h-full bg-base-0">

      {/* Messages scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 py-6">

          {messages.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 280px)' }}>
              <WelcomeScreen onSelect={handleSuggestion} hasConnection={hasConnection} />
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  msg={msg}
                  onUpdate={updateMessage}
                  onSaveSnippet={handleSaveSnippet}
                  connectionId={activeConnectionId}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area — fixed at bottom */}
      <div
        className="flex-shrink-0 border-t border-border px-4 py-5"
        style={{ background: 'var(--ds-base-0)' }}
      >
        <div className="max-w-4xl mx-auto space-y-3">

          {/* Connection selector */}
          {connections.length > 0 && (
            <div ref={connSelectorRef} className="relative inline-block">
              <button
                onClick={() => setConnectionSelectorOpen(!connectionSelectorOpen)}
                className={[
                  'flex items-center gap-2 h-8 px-4 rounded-full border text-[14px] font-medium transition-colors duration-[100ms]',
                  hasConnection
                    ? 'border-success/30 text-success hover:bg-[var(--ds-success-muted)]'
                    : 'border-border text-content-3 hover:bg-base-2',
                ].join(' ')}
                style={hasConnection ? { background: 'var(--ds-success-muted)' } : {}}
              >
                <span
                  className={[
                    'h-1.5 w-1.5 rounded-full flex-shrink-0',
                    hasConnection ? 'bg-success' : 'bg-base-5',
                  ].join(' ')}
                />
                {activeConnection?.name ?? 'Select database'}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {connectionSelectorOpen && (
                <div
                  className="absolute bottom-full mb-2 left-0 w-56 rounded-xl p-1.5 z-50"
                  style={{
                    background: 'var(--ds-base-0)',
                    border: '1px solid var(--ds-border-moderate)',
                    boxShadow: 'var(--ds-shadow-lg)',
                  }}
                >
                  {connections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => {
                        setActiveConnection(conn.id);
                        setConnectionSelectorOpen(false);
                      }}
                      className={[
                        'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors',
                        activeConnectionId === conn.id
                          ? 'bg-brand-subtle text-brand font-medium'
                          : 'text-content-2 hover:bg-base-1 hover:text-content-1',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full flex-shrink-0',
                          conn.is_active !== false ? 'bg-success' : 'bg-error',
                        ].join(' ')}
                      />
                      <span className="truncate">{conn.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-content-3 uppercase">
                        {conn.db_type?.slice(0, 4)}
                      </span>
                    </button>
                  ))}
                  <div className="h-px bg-border my-1.5" />
                  <Link
                    href="/connections/new"
                    onClick={() => setConnectionSelectorOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-content-2 hover:bg-base-1 hover:text-content-1 transition-colors"
                  >
                    <Database className="h-3.5 w-3.5 text-content-3" />
                    Add database
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Input box */}
          <div
            className="flex items-end gap-3 rounded-2xl border border-border px-5 py-4 transition-[border-color,box-shadow] duration-[100ms] focus-within:border-[var(--ds-border-accent)]"
            style={{
              background: 'var(--ds-base-0)',
              boxShadow: 'var(--ds-shadow-md)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                !activeConnectionId
                  ? 'Connect a database to start querying…'
                  : 'Ask anything about your data…'
              }
              disabled={!activeConnectionId || isSubmitting}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-content-1 placeholder:text-content-3 outline-none leading-relaxed disabled:cursor-not-allowed"
              style={{ maxHeight: 180, minHeight: 28 }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || !activeConnectionId || isSubmitting}
              className={[
                'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-[background-color,opacity] duration-[100ms]',
                input.trim() && activeConnectionId && !isSubmitting
                  ? 'opacity-100 text-white'
                  : 'opacity-30 text-content-3',
              ].join(' ')}
              style={
                input.trim() && activeConnectionId && !isSubmitting
                  ? { background: 'var(--ds-accent)' }
                  : { background: 'var(--ds-base-4)' }
              }
              aria-label="Send"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>

          <p className="text-center text-[13px] text-content-3">
            <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
