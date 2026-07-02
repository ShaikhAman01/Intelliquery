'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
} from 'react';
import { useStore } from '@/lib/store';
import { sendQuery, executeSQL, getSchema, createSampleConnection } from '@/lib/api';
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
  ChevronUp,
  Loader2,
  ArrowUp,
  Database,
  Zap,
  TrendingUp,
  AlertTriangle,
  X,
  PlusCircle,
  Pencil,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
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
  sqlEditing: boolean;
  editedSql: string;
  isRunningEdit: boolean;
  isConversational?: boolean;
}

/* ── AI workflow stages ─────────────────────────────────────── */

const WORKFLOW_STAGES = [
  'Understanding your question',
  'Analyzing database schema',
  'Selecting relevant tables',
  'Generating optimized SQL',
  'Validating query',
  'Executing query',
  'Analyzing results',
  'Generating AI insights',
];

function AIThinkingStages() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, WORKFLOW_STAGES.length - 1));
    }, 1350);
    return () => clearInterval(t);
  }, []);

  const label = WORKFLOW_STAGES[stageIdx];

  return (
    <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2.5"
      style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
    >
      <Loader2 className="h-3.5 w-3.5 text-brand flex-shrink-0 animate-spin" />
      <AnimatePresence mode="wait">
        <motion.span
          key={stageIdx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className="text-[13px] text-content-2"
        >
          {label}…
        </motion.span>
      </AnimatePresence>
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

/* ── AI response card ───────────────────────────────────────── */

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const CHART_LABELS: Record<string, string> = {
  bar: 'Bar chart', line: 'Line chart', area: 'Area chart',
  pie: 'Pie chart', kpi: 'KPI cards', table: 'Data table',
};

interface AIResponseCardProps {
  explanation: string;
  data: Record<string, unknown>[];
  sql: string;
  chartRec?: { chart_type: string; reason?: string };
  onFollowUp?: (q: string) => void;
}

function AIResponseCard({ explanation, data, sql, chartRec, onFollowUp }: AIResponseCardProps) {
  const observations = useMemo(() => {
    if (!data.length) return [];
    const cols = Object.keys(data[0]);
    const obs: string[] = [];

    obs.push(
      `Returned ${data.length.toLocaleString()} row${data.length !== 1 ? 's' : ''} across ${cols.length} column${cols.length !== 1 ? 's' : ''}.`
    );

    const numCols = cols.filter((c) => typeof data[0][c] === 'number');
    if (numCols.length > 0) {
      const col = numCols[0];
      const vals = data.map((r) => Number(r[col])).filter((n) => !isNaN(n));
      if (vals.length > 1) {
        const sum = vals.reduce((a, b) => a + b, 0);
        const max = Math.max(...vals);
        obs.push(`${col.replace(/_/g, ' ')}: total ${fmtNum(sum)}, peak ${fmtNum(max)}.`);
      }
    }

    let nulls = 0;
    data.forEach((row) => cols.forEach((c) => { if (row[c] === null || row[c] === undefined) nulls++; }));
    if (nulls > 0) {
      obs.push(`${nulls} missing value${nulls !== 1 ? 's' : ''} detected across the result set.`);
    }

    return obs;
  }, [data]);

  const followUps = useMemo(() => {
    const q: string[] = [];
    const up = sql.toUpperCase();
    if (up.includes('GROUP BY'))        q.push('How has this changed over the last 3 months?');
    if (!up.includes('LIMIT'))          q.push('Show only the top 10 results');
    if (!up.includes('WHERE'))          q.push('Filter by a specific date range');
    else                                q.push('Expand the filter to include more records');
    if (data.length > 0) {
      const firstCol = Object.keys(data[0])[0];
      q.push(`Break down by ${firstCol.replace(/_/g, ' ')}`);
    }
    return q.slice(0, 3);
  }, [sql, data]);

  return (
    <div
      className="rounded-xl overflow-hidden text-[13px]"
      style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
    >
      {/* Summary */}
      {explanation && (
        <div className="px-4 py-3.5 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-3 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-brand" /> Summary
          </p>
          <p className="leading-relaxed text-content-2">{explanation}</p>
        </div>
      )}

      {/* Key observations */}
      {observations.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-3 mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-brand" /> Key Observations
          </p>
          <ul className="space-y-1.5">
            {observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-content-2">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--ds-accent)' }} />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up questions */}
      {followUps.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-3 mb-2 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-brand" /> Suggested Follow-ups
          </p>
          <div className="space-y-1">
            {followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(q)}
                className="flex items-center gap-2 w-full text-left text-content-2 hover:text-content-1 py-0.5 transition-colors duration-[100ms]"
              >
                <ArrowRight className="h-3 w-3 text-content-3 flex-shrink-0" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart recommendation */}
      {chartRec && chartRec.chart_type !== 'table' && (
        <div className="px-4 py-3 flex items-center gap-2.5">
          <BarChart3 className="h-3.5 w-3.5 text-brand flex-shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-content-3">Recommended Viz</span>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'var(--ds-accent-muted)', color: 'var(--ds-accent)' }}
          >
            {CHART_LABELS[chartRec.chart_type] ?? chartRec.chart_type}
          </span>
          {chartRec.reason && (
            <span className="text-content-3 text-[12px] truncate">{chartRec.reason}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual message ─────────────────────────────────────── */

interface MessageProps {
  msg: ChatMessage;
  onUpdate: (id: string, patch: Partial<ChatMessage>) => void;
  onSaveSnippet: (id: string) => void;
  connectionId: number | null;
  onSelect?: (text: string) => void;
  onRetry?: (query: string) => void;
}

function Message({ msg, onUpdate, onSaveSnippet, connectionId, onSelect, onRetry }: MessageProps) {
  const { toast } = useToast();

  const displaySql = msg.editedSql || msg.sql || '';
  const isModified = !!msg.editedSql && msg.editedSql !== msg.sql;

  const handleCopy = async () => {
    if (!displaySql) return;
    await navigator.clipboard.writeText(displaySql);
    onUpdate(msg.id, { copied: true });
    toast('SQL copied to clipboard', 'success');
    setTimeout(() => onUpdate(msg.id, { copied: false }), 2000);
  };

  const handleRunEdited = async () => {
    if (!connectionId || !displaySql) return;
    onUpdate(msg.id, { isRunningEdit: true });
    try {
      const result = await executeSQL(displaySql, connectionId);
      onUpdate(msg.id, {
        data: result.data,
        executionTime: result.execution_time_ms,
        runExpanded: true,
        insightsExpanded: false,
        sqlEditing: false,
        isRunningEdit: false,
      });
    } catch (err: unknown) {
      const detail = (err as any)?.response?.data?.detail ?? 'Execution failed.';
      toast(detail, 'error');
      onUpdate(msg.id, { isRunningEdit: false });
    }
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
          {msg.status === 'thinking' && <AIThinkingStages />}

          {/* Error state */}
          {msg.status === 'error' && (
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-4 text-[13px] space-y-3"
              style={{ background: 'var(--ds-error-muted)', border: '1px solid var(--ds-error-border)' }}
            >
              <div className="flex items-start gap-2.5 text-error">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {msg.errorMessage || "Couldn't generate a valid query for that question."}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <button
                  onClick={() => onRetry?.(msg.userQuery)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: 'var(--ds-error-border)', color: 'var(--ds-error)' }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Try rephrasing
                </button>
                <span className="text-[12px] text-error/60">or add more context to your question</span>
              </div>
            </div>
          )}

          {/* Conversational response */}
          {msg.status === 'ready' && msg.isConversational && msg.explanation && (
            <div
              className="rounded-2xl rounded-tl-sm px-5 py-4 text-[14px] leading-relaxed text-content-2 whitespace-pre-line"
              style={{ background: 'var(--ds-base-1)', border: '1px solid var(--ds-border-subtle)' }}
            >
              {msg.explanation}
            </div>
          )}

          {/* Ready state */}
          {msg.status === 'ready' && !msg.isConversational && msg.sql && (
            <>
              {/* AI response card */}
              {(msg.explanation || (msg.data && msg.data.length > 0)) && (
                <AIResponseCard
                  explanation={msg.explanation ?? ''}
                  data={msg.data ?? []}
                  sql={msg.sql!}
                  chartRec={msg.chartRec}
                  onFollowUp={onSelect}
                />
              )}

              {/* SQL block */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--ds-base-1)',
                  border: `1px solid ${msg.sqlEditing ? 'var(--ds-border-accent)' : 'var(--ds-border-subtle)'}`,
                }}
              >
                {/* SQL header */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-b border-border gap-2"
                  style={{ background: 'var(--ds-base-2)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-content-3 uppercase tracking-wider">SQL</span>
                    {isModified && !msg.sqlEditing && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--ds-warning-muted)', color: 'var(--ds-warning)' }}>
                        modified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {msg.sqlEditing ? (
                      <>
                        <button
                          onClick={() => onUpdate(msg.id, { sqlEditing: false, editedSql: msg.sql ?? '' })}
                          className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button
                          onClick={handleRunEdited}
                          disabled={msg.isRunningEdit}
                          className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] font-medium text-white transition-colors disabled:opacity-60"
                          style={{ background: 'var(--ds-accent)' }}
                        >
                          {msg.isRunningEdit
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Play className="h-3 w-3" />}
                          Run
                        </button>
                      </>
                    ) : (
                      <>
                        {isModified && (
                          <button
                            onClick={() => onUpdate(msg.id, { editedSql: '', sqlEditing: false })}
                            className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" /> Reset
                          </button>
                        )}
                        <button
                          onClick={() => onUpdate(msg.id, { sqlEditing: true, editedSql: displaySql })}
                          className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={handleCopy}
                          className="h-6 flex items-center gap-1.5 px-2 rounded text-[11px] text-content-3 hover:text-content-1 hover:bg-base-3 transition-colors"
                        >
                          {msg.copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                          {msg.copied ? 'Copied' : 'Copy'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* SQL body — editable textarea or syntax-highlighted read-only */}
                {msg.sqlEditing ? (
                  <textarea
                    autoFocus
                    value={msg.editedSql}
                    onChange={(e) => onUpdate(msg.id, { editedSql: e.target.value })}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleRunEdited(); }
                      if (e.key === 'Escape') onUpdate(msg.id, { sqlEditing: false, editedSql: msg.sql ?? '' });
                    }}
                    className="w-full px-4 py-3 font-mono text-[12px] bg-transparent text-content-1 outline-none resize-none custom-scrollbar"
                    style={{ minHeight: 100 }}
                    rows={Math.max(4, (msg.editedSql || '').split('\n').length + 1)}
                  />
                ) : (
                  <pre className="px-4 py-3 overflow-x-auto custom-scrollbar">
                    <code className="font-mono text-[12px] text-content-code">
                      {highlightSQL(displaySql)}
                    </code>
                  </pre>
                )}
              </div>

              {/* Action row */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onUpdate(msg.id, { runExpanded: !msg.runExpanded, insightsExpanded: false })}
                  className="h-9 gap-1.5 text-[13px] font-medium px-4"
                >
                  {msg.runExpanded ? <ChevronUp className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {msg.runExpanded ? 'Hide Results' : 'Show Results'}
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
                {msg.runExpanded && msg.data && msg.data.length > 0 && (
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
                    className="rounded-xl border border-border bg-base-1 px-5 py-6 text-center space-y-1"
                  >
                    <p className="text-[14px] font-medium text-content-2">No results found</p>
                    <p className="text-[13px] text-content-3">The query ran successfully but returned 0 rows. Try broadening your filters or adjusting the date range.</p>
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

type Suggestion = { label: string; icon: React.ElementType };

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { label: 'Show top 10 customers by revenue', icon: TrendingUp },
  { label: 'Find anomalies in the transactions', icon: AlertTriangle },
  { label: 'Compare sales across regions this month', icon: Zap },
];

/* Table names may already be plural (e.g. "customers") — only append "s" when needed */
const plural = (t: string) => (t.endsWith('s') ? t : `${t}s`);

const TABLE_TEMPLATES: Array<{
  keywords: string[];
  template: (t: string) => string;
  icon: React.ElementType;
}> = [
  { keywords: ['order', 'sale', 'purchase'], template: t => `Show top 10 ${t} by total amount`, icon: TrendingUp },
  { keywords: ['customer', 'user', 'client', 'member'], template: t => `Find most active ${plural(t)} this month`, icon: Zap },
  { keywords: ['product', 'item', 'inventory', 'stock'], template: t => `List ${plural(t)} with the lowest stock`, icon: AlertTriangle },
  { keywords: ['payment', 'invoice', 'billing', 'transaction'], template: t => `Find pending ${plural(t)} from the last 30 days`, icon: TrendingUp },
  { keywords: ['log', 'event', 'activity', 'audit'], template: t => `Show recent ${t} entries`, icon: Zap },
  { keywords: ['employee', 'staff', 'team'], template: t => `List ${plural(t)} grouped by department`, icon: Zap },
  { keywords: ['category', 'tag', 'type', 'status'], template: t => `Count records grouped by ${t}`, icon: TrendingUp },
  { keywords: ['report', 'metric', 'stat', 'analytic'], template: t => `Summarize ${t} for this quarter`, icon: TrendingUp },
];

function getSuggestionsFromTables(tableNames: string[]) {
  const used = new Set<string>();
  const result: Array<{ label: string; icon: React.ElementType }> = [];

  for (const tpl of TABLE_TEMPLATES) {
    if (result.length >= 3) break;
    for (const table of tableNames) {
      if (used.has(table)) continue;
      if (tpl.keywords.some(k => table.toLowerCase().includes(k))) {
        result.push({ label: tpl.template(table), icon: tpl.icon });
        used.add(table);
        break;
      }
    }
  }

  const icons = [TrendingUp, Zap, AlertTriangle];
  for (const table of tableNames) {
    if (result.length >= 3) break;
    if (!used.has(table)) {
      result.push({ label: `Show top records from ${table}`, icon: icons[result.length % 3] });
      used.add(table);
    }
  }

  return result.length > 0 ? result : FALLBACK_SUGGESTIONS;
}

const META_PATTERNS = [
  /\bwho are you\b/i,
  /\bwhat (is|are) (you|intelliquery)\b/i,
  /\bwhat can (you|intelliquery) do\b/i,
  /\bhow (do you|does intelliquery) work\b/i,
  /\btell me about (yourself|intelliquery)\b/i,
  /^(hi|hello|hey)[^a-z]*$/i,
];

const INTELLIQUERY_RESPONSE = `I'm IntelliQuery — your AI-powered SQL assistant. I translate plain English questions into SQL queries and analyze your database results.

Here's what I can help with:
• Ask questions about your data in plain English
• Generate and run optimized SQL queries automatically
• Visualize results as charts, tables, and KPI cards
• Surface AI insights and observations from your data
• Save useful queries as snippets for later

Try asking something like "Show me the top 10 customers by revenue" or "Which products had the most sales last month?"`;

const ONBOARDING_EXAMPLES = [
  'Show me the top 10 customers by revenue',
  'Which products had the most returns last month?',
  'Compare signups this week vs last week',
];

function WelcomeScreen({
  onSelect,
  hasConnection,
  hasAnyConnection,
  suggestions,
  onTrySample,
  sampleLoading,
}: {
  onSelect: (text: string) => void;
  hasConnection: boolean;
  hasAnyConnection: boolean;
  suggestions: Suggestion[];
  onTrySample: () => void;
  sampleLoading: boolean;
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
          {!hasAnyConnection ? 'Get started' : 'What would you like to explore?'}
        </h1>
        <p className="mt-3 text-[16px] text-content-3 max-w-md mx-auto leading-relaxed">
          {!hasAnyConnection
            ? 'Connect a database and ask questions in plain English — Intelliquery handles the SQL.'
            : 'Ask a question in plain English and Intelliquery will generate the SQL and analyze your data.'
          }
        </p>
      </div>

      {!hasAnyConnection ? (
        /* ── First-time user: no connections at all ── */
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="flex flex-col gap-2 w-full">
            {ONBOARDING_EXAMPLES.map((ex) => (
              <div
                key={ex}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left select-none"
                style={{ background: 'var(--ds-base-1)', opacity: 0.45 }}
              >
                <MessageSquare className="h-4 w-4 text-brand flex-shrink-0" />
                <span className="text-[14px] text-content-2">{ex}</span>
              </div>
            ))}
          </div>
          <Link href="/connections/new" className="w-full">
            <Button className="w-full gap-2 h-11 text-[15px] font-semibold">
              <PlusCircle className="h-4 w-4" />
              Connect your first database
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={onTrySample}
            disabled={sampleLoading}
            className="w-full gap-2 h-11 text-[14px] font-medium"
          >
            {sampleLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Database className="h-4 w-4" />}
            {sampleLoading ? 'Setting up sample data…' : 'Try the sample database'}
          </Button>
          <p className="text-[12px] text-content-3">
            No database handy? The sample is a ready-to-query e-commerce store.
          </p>
        </div>
      ) : !hasConnection ? (
        /* ── Has connections but none active ── */
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border border-border px-10 py-8"
          style={{ background: 'var(--ds-base-1)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <Database className="h-10 w-10 text-content-3" />
          <div>
            <p className="font-semibold text-content-1 text-[16px]">No database selected</p>
            <p className="mt-1 text-[14px] text-content-3">Pick a database from the sidebar to start querying</p>
          </div>
        </div>
      ) : (
        /* ── Active connection: show schema-based suggestions ── */
        <div className="flex flex-col gap-3 w-full max-w-xl">
          {suggestions.map(({ label, icon: Icon }) => (
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

interface RestoreSession {
  id: string;
  connectionId: number;
  queries: Array<{ question: string; sql: string }>;
}

interface ChatInterfaceProps {
  pendingReplay?: string | null;
  onReplayConsumed?: () => void;
  onQueryComplete?: (question: string, sql: string, connectionId: number) => void;
  pendingReplayCached?: { question: string; sql: string } | null;
  onReplayCachedConsumed?: () => void;
  pendingRestore?: RestoreSession | null;
  onRestoreConsumed?: () => void;
}

export function ChatInterface({ pendingReplay, onReplayConsumed, onQueryComplete, pendingReplayCached, onReplayCachedConsumed, pendingRestore, onRestoreConsumed }: ChatInterfaceProps = {}) {
  const { connections, activeConnectionId, setActiveConnection, addConnection } = useStore();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionSelectorOpen, setConnectionSelectorOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS);
  const [sampleLoading, setSampleLoading] = useState(false);

  /* One-click sample database — the zero-setup onboarding path */
  const handleTrySample = useCallback(async () => {
    if (sampleLoading) return;
    setSampleLoading(true);
    try {
      const conn = await createSampleConnection();
      if (!useStore.getState().connections.some((c) => c.id === conn.id)) {
        addConnection(conn);
      }
      setActiveConnection(conn.id);
      toast('Sample store connected — ask your first question below!', 'success');
    } catch {
      toast('Could not set up the sample database. Please try again.', 'error');
    } finally {
      setSampleLoading(false);
    }
  }, [sampleLoading, addConnection, setActiveConnection, toast]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const connSelectorRef = useRef<HTMLDivElement>(null);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  /* Rebuild suggestions whenever the active connection changes */
  useEffect(() => {
    if (!activeConnectionId) { setSuggestions(FALLBACK_SUGGESTIONS); return; }
    getSchema(activeConnectionId)
      .then((res) => {
        const tables = Object.keys(res.tables || res);
        setSuggestions(getSuggestionsFromTables(tables));
      })
      .catch(() => setSuggestions(FALLBACK_SUGGESTIONS));
  }, [activeConnectionId]);

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

  /* Submit — accepts an optional direct query string (used by replay) */
  const handleSubmit = useCallback(async (overrideQuery?: string) => {
    const query = (typeof overrideQuery === 'string' ? overrideQuery : input).trim();
    if (!query || isSubmitting) return;
    if (!activeConnectionId) {
      toast('Select a database connection first.', 'error');
      return;
    }

    /* Answer meta/conversational questions locally without hitting the backend */
    if (META_PATTERNS.some(p => p.test(query))) {
      const id = `msg-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id, userQuery: query, status: 'thinking', runExpanded: false, insightsExpanded: false, saveOpen: false, snippetTitle: '', copied: false, sqlEditing: false, editedSql: '', isRunningEdit: false },
      ]);
      if (typeof overrideQuery !== 'string') {
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      setTimeout(() => updateMessage(id, { status: 'ready', isConversational: true, explanation: INTELLIQUERY_RESPONSE }), 500);
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
        sqlEditing: false,
        editedSql: '',
        isRunningEdit: false,
      },
    ]);
    if (typeof overrideQuery !== 'string') {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
    setIsSubmitting(true);
    let successSql: string | undefined;

    try {
      const result = await sendQuery(query, activeConnectionId);
      successSql = result.sql || '';
      updateMessage(id, {
        sql: successSql,
        explanation: result.explanation || '',
        data: result.data || [],
        chartRec: result.chart_recommendation,
        executionTime: result.execution_time_ms,
        status: 'ready',
        runExpanded: true,
      });
    } catch (err: unknown) {
      let detail = 'Something went wrong. Please try again.';
      if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>;
        const res = e.response as Record<string, unknown> | undefined;
        const resData = res?.data as Record<string, unknown> | undefined;
        const httpStatus = res?.status as number | undefined;
        if (httpStatus === 500) {
          detail = "Couldn't process that question. Try rephrasing with clearer terms, or check for typos.";
        } else if (typeof resData?.detail === 'string') {
          detail = resData.detail;
        } else if (e instanceof Error) {
          detail = (e as Error).message;
        }
      }
      updateMessage(id, { status: 'error', errorMessage: detail });
    } finally {
      setIsSubmitting(false);
      if (successSql !== undefined) onQueryComplete?.(query, successSql, activeConnectionId);
    }
  }, [input, isSubmitting, activeConnectionId, toast, updateMessage, onQueryComplete]);

  /* Stable ref so the pendingReplay effect always calls the latest handleSubmit */
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  /* Track which replay we've already fired so StrictMode double-invoke doesn't duplicate */
  const lastReplayedRef = useRef<string | null>(null);

  /* Auto-submit when a replay is injected from another view */
  useEffect(() => {
    if (!pendingReplay || lastReplayedRef.current === pendingReplay) return;
    lastReplayedRef.current = pendingReplay;
    handleSubmitRef.current(pendingReplay);
    onReplayConsumed?.();
  }, [pendingReplay, onReplayConsumed]);

  /* Fast cached replay — executes stored SQL directly, skips AI */
  const handleSubmitCached = useCallback(async (question: string, sql: string) => {
    if (!activeConnectionId || isSubmitting) return;
    const id = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id, userQuery: question, status: 'thinking', runExpanded: false, insightsExpanded: false, saveOpen: false, snippetTitle: '', copied: false, sqlEditing: false, editedSql: '', isRunningEdit: false },
    ]);
    setIsSubmitting(true);
    let succeeded = false;
    try {
      const result = await executeSQL(sql, activeConnectionId);
      updateMessage(id, { sql, data: result.data || [], executionTime: result.execution_time_ms, status: 'ready' });
      succeeded = true;
    } catch (err: unknown) {
      let detail = 'SQL execution failed.';
      if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>;
        const res = e.response as Record<string, unknown> | undefined;
        const resData = res?.data as Record<string, unknown> | undefined;
        if (typeof resData?.detail === 'string') detail = resData.detail;
      }
      updateMessage(id, { status: 'error', errorMessage: detail });
    } finally {
      setIsSubmitting(false);
      if (succeeded) onQueryComplete?.(question, sql, activeConnectionId);
    }
  }, [activeConnectionId, isSubmitting, updateMessage, onQueryComplete]);

  const handleSubmitCachedRef = useRef(handleSubmitCached);
  useEffect(() => { handleSubmitCachedRef.current = handleSubmitCached; }, [handleSubmitCached]);

  const lastReplayedCachedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingReplayCached) return;
    const key = `${pendingReplayCached.question}::${pendingReplayCached.sql}`;
    if (lastReplayedCachedRef.current === key) return;
    lastReplayedCachedRef.current = key;
    handleSubmitCachedRef.current(pendingReplayCached.question, pendingReplayCached.sql);
    onReplayCachedConsumed?.();
  }, [pendingReplayCached, onReplayCachedConsumed]);

  /* Session restore — rebuild full conversation by executing all queries in parallel */
  const lastRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingRestore || !activeConnectionId) return;
    if (lastRestoredRef.current === pendingRestore.id) return;
    lastRestoredRef.current = pendingRestore.id;

    if (pendingRestore.connectionId && pendingRestore.connectionId !== activeConnectionId) {
      setActiveConnection(pendingRestore.connectionId);
    }

    const connId = pendingRestore.connectionId || activeConnectionId;
    const initialMsgs: ChatMessage[] = pendingRestore.queries.map((q, i) => ({
      id: `restore-${pendingRestore.id}-${i}`,
      userQuery: q.question,
      sql: q.sql,
      status: 'thinking' as const,
      runExpanded: false,
      insightsExpanded: false,
      saveOpen: false,
      snippetTitle: '',
      copied: false,
      sqlEditing: false,
      editedSql: '',
      isRunningEdit: false,
    }));
    setMessages(initialMsgs);

    Promise.all(
      initialMsgs.map(async (msg, i) => {
        const q = pendingRestore.queries[i];
        try {
          const result = await executeSQL(q.sql, connId);
          updateMessage(msg.id, { data: result.data || [], executionTime: result.execution_time_ms, status: 'ready' });
        } catch {
          updateMessage(msg.id, { status: 'error', errorMessage: 'Query failed.' });
        }
      })
    ).finally(() => onRestoreConsumed?.());
  }, [pendingRestore, activeConnectionId, setActiveConnection, updateMessage, onRestoreConsumed]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const hasConnection = !!activeConnectionId && activeConnection?.is_active !== false;
  const hasAnyConnection = connections.length > 0;

  return (
    <div className="flex flex-col h-full bg-base-0">

      {/* Messages scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-4 py-6">

          {messages.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 280px)' }}>
              <WelcomeScreen
                onSelect={handleSuggestion}
                hasConnection={hasConnection}
                hasAnyConnection={hasAnyConnection}
                suggestions={suggestions}
                onTrySample={handleTrySample}
                sampleLoading={sampleLoading}
              />
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
                  onSelect={handleSuggestion}
                  onRetry={(query) => {
                    setInput(query);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
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
        <div className="max-w-5xl mx-auto space-y-3">

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
              onClick={() => handleSubmit()}
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
            <kbd className="font-mono">Enter</kbd> to send &nbsp;·&nbsp; <kbd className="font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
