'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChartPanel } from '@/components/Chat/Visualizer';
import { SQLDisplay } from '@/components/Query/SQLDisplay';
import { ResultsTable } from '@/components/Chat/ResultsTable';
import { Button } from '@/components/ui/button';
import {
  Download,
  AlertTriangle,
  Info,
  ChevronDown,
  Sparkles,
  Hash,
  CaseSensitive,
  CalendarDays,
  Maximize2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';
type Tab = 'overview' | 'chart' | 'data' | 'sql';
type ColType = 'number' | 'date' | 'string';

interface InsightsViewProps {
  sql: string;
  explanation: string;
  data: Record<string, unknown>[];
  chartRec?: { chart_type: ChartType; reason?: string };
  executionTime?: number;
}

interface ColStats {
  name: string;
  type: ColType;
  count: number;
  nulls: number;
  nullPct: number;
  unique: number;
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  topValue?: string;
  topCount?: number;
  minDate?: string;
  maxDate?: string;
}

interface KPI {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

interface DataNotice {
  col: string;
  message: string;
  severity: 'warn' | 'info';
}

/* ─── helpers ───────────────────────────────────────────────── */

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function computeStats(data: Record<string, unknown>[]): ColStats[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map(col => {
    const values = data.map(r => r[col]);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const nulls = values.length - nonNull.length;
    const nullPct = values.length ? (nulls / values.length) * 100 : 0;
    const unique = new Set(nonNull.map(v => String(v))).size;

    const numericVals = nonNull.map(v => Number(v)).filter(n => !isNaN(n) && isFinite(n));
    if (numericVals.length === nonNull.length && nonNull.length > 0) {
      const min = Math.min(...numericVals);
      const max = Math.max(...numericVals);
      const sum = numericVals.reduce((a, b) => a + b, 0);
      return { name: col, type: 'number' as ColType, count: nonNull.length, nulls, nullPct, unique, min, max, sum, mean: sum / numericVals.length };
    }

    if (nonNull.length > 0 && nonNull.every(v => /^\d{4}-\d{2}-\d{2}/.test(String(v)))) {
      const sorted = nonNull.map(v => String(v)).sort();
      return { name: col, type: 'date' as ColType, count: nonNull.length, nulls, nullPct, unique, minDate: sorted[0], maxDate: sorted[sorted.length - 1] };
    }

    const freq: Record<string, number> = {};
    nonNull.forEach(v => { const s = String(v); freq[s] = (freq[s] || 0) + 1; });
    const byFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return { name: col, type: 'string' as ColType, count: nonNull.length, nulls, nullPct, unique, topValue: byFreq[0]?.[0], topCount: byFreq[0]?.[1] };
  });
}

function deriveKPIs(data: Record<string, unknown>[], stats: ColStats[]): KPI[] {
  const kpis: KPI[] = [];
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed'];

  kpis.push({ label: 'Total Rows', value: data.length.toLocaleString(), sub: `${stats.length} column${stats.length !== 1 ? 's' : ''}`, color: COLORS[0] });

  const nonIdNums = stats.filter(s => s.type === 'number' && !/(^id$|_id$|^pk$|^key$)/i.test(s.name));
  nonIdNums.slice(0, 2).forEach((s, i) => {
    if (s.sum !== undefined && s.mean !== undefined) {
      kpis.push({ label: s.name.replace(/_/g, ' '), value: fmt(s.sum), sub: `avg ${fmt(s.mean)}`, color: COLORS[i + 1] });
    }
  });

  const totalCells = data.length * stats.length;
  const totalNulls = stats.reduce((sum, s) => sum + s.nulls, 0);
  const completeness = totalCells ? (1 - totalNulls / totalCells) * 100 : 100;
  kpis.push({
    label: 'Completeness',
    value: `${completeness.toFixed(1)}%`,
    sub: totalNulls > 0 ? `${totalNulls} missing values` : 'No missing data',
    color: completeness > 95 ? '#16a34a' : completeness > 80 ? '#d97706' : '#dc2626',
  });

  return kpis.slice(0, 4);
}

function detectNotices(stats: ColStats[]): DataNotice[] {
  const notices: DataNotice[] = [];
  stats.forEach(s => {
    if (s.nullPct > 20)
      notices.push({ col: s.name, message: `${s.nullPct.toFixed(0)}% missing values`, severity: 'warn' });
    if (s.type === 'number' && s.max !== undefined && s.mean !== undefined && s.mean > 0 && s.max > s.mean * 10)
      notices.push({ col: s.name, message: `max (${fmt(s.max)}) is >10× the average — possible outlier`, severity: 'warn' });
    if (s.unique === 1 && s.count > 1)
      notices.push({ col: s.name, message: `constant column — all values are "${s.topValue ?? s.minDate}"`, severity: 'info' });
  });
  return notices;
}

/* ─── sub-components ────────────────────────────────────────── */

function TypeBadge({ type }: { type: ColType }) {
  const cfg = {
    number: { Icon: Hash,            label: 'num',  bg: 'rgba(37,99,235,0.10)',  color: '#2563eb' },
    string: { Icon: CaseSensitive,   label: 'str',  bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
    date:   { Icon: CalendarDays,    label: 'date', bg: 'rgba(13,148,136,0.10)', color: '#0d9488' },
  }[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <cfg.Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function NullBar({ pct }: { pct: number }) {
  const barColor = pct > 20 ? '#dc2626' : pct > 5 ? '#d97706' : '#16a34a';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-base-4)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
      </div>
      <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--ds-text-3)' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function ColSelector({ label, columns, value, onChange }: { label: string; columns: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-medium" style={{ color: 'var(--ds-text-3)' }}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-[13px] cursor-pointer focus:outline-none transition-colors duration-[100ms]"
          style={{
            background: 'var(--ds-base-0)',
            border: '1px solid var(--ds-border-moderate)',
            color: 'var(--ds-text-1)',
          }}
        >
          {columns.map(col => <option key={col} value={col}>{col}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--ds-text-3)' }} />
      </div>
    </div>
  );
}

/* ─── main ──────────────────────────────────────────────────── */

export function InsightsView({ sql, explanation, data, chartRec, executionTime }: InsightsViewProps) {
  const [tab, setTab] = useState<Tab>('overview');

  const stats    = useMemo(() => computeStats(data), [data]);
  const kpis     = useMemo(() => deriveKPIs(data, stats), [data, stats]);
  const notices  = useMemo(() => detectNotices(stats), [stats]);

  const allCols     = data.length > 0 ? Object.keys(data[0]) : [];
  const stringCols  = stats.filter(s => s.type === 'string' || s.type === 'date').map(s => s.name);
  const numericCols = stats.filter(s => s.type === 'number').map(s => s.name);

  const [xKey, setXKey] = useState<string>(stringCols[0] || allCols[0] || '');
  const [yKey, setYKey] = useState<string>(numericCols[0] || allCols[1] || '');
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mainEl, setMainEl] = useState<Element | null>(null);

  useEffect(() => { setMainEl(document.querySelector('main')); }, []);

  useEffect(() => {
    if (!chartFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChartFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chartFullscreen]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const downloadChart = () => {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intelliquery_chart.png';
    a.click();
  };

  const downloadReport = () => {
    const lines = [
      '# Intelliquery Analytics Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '## SQL Query',
      '```sql',
      sql,
      '```',
      '',
      '## AI Analysis',
      explanation,
      '',
      '## Key Metrics',
      ...kpis.map(k => `- **${k.label}**: ${k.value}${k.sub ? ` (${k.sub})` : ''}`),
      '',
      '## Column Profile',
      '| Column | Type | Rows | Null% | Unique | Stats |',
      '|--------|------|------|-------|--------|-------|',
      ...stats.map(s => {
        const statsCell = s.type === 'number'
          ? `min ${fmt(s.min!)} · avg ${fmt(s.mean!)} · max ${fmt(s.max!)}`
          : s.type === 'date'
            ? `${s.minDate} → ${s.maxDate}`
            : s.topValue ? `most common: "${s.topValue}"` : '-';
        return `| ${s.name} | ${s.type} | ${s.count} | ${s.nullPct.toFixed(0)}% | ${s.unique} | ${statsCell} |`;
      }),
      '',
      '## Data (first 200 rows)',
      allCols.join(','),
      ...data.slice(0, 200).map(row =>
        allCols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return '';
          const sv = String(v);
          return sv.includes(',') || sv.includes('"') ? `"${sv.replace(/"/g, '""')}"` : sv;
        }).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intelliquery_report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'chart',    label: 'Chart' },
    { key: 'data',     label: `Data (${data.length.toLocaleString()})` },
    { key: 'sql',      label: 'SQL' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className="rounded-xl border border-border overflow-hidden"
      style={{ background: 'var(--ds-base-0)', boxShadow: 'var(--ds-shadow-sm)' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center justify-between border-b border-border"
        style={{ background: 'var(--ds-base-1)' }}
      >
        <div className="flex items-center pl-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-[100ms] whitespace-nowrap',
                tab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-content-3 hover:text-content-1',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadReport}
          className="h-8 gap-1.5 px-3 text-[12px] text-content-3 hover:text-content-1 flex-shrink-0 mr-2"
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </Button>
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="p-5 space-y-5">

          {/* KPI strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="rounded-xl border border-border p-4 flex flex-col gap-2"
                style={{ background: 'var(--ds-base-1)', boxShadow: 'var(--ds-shadow-sm)' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate capitalize" style={{ color: 'var(--ds-text-3)' }}>
                  {kpi.label}
                </span>
                <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
                {kpi.sub && <span className="text-[12px]" style={{ color: 'var(--ds-text-3)' }}>{kpi.sub}</span>}
              </div>
            ))}
          </div>

          {/* AI Analysis */}
          {explanation && (
            <div className="rounded-xl border border-border p-4 space-y-2" style={{ background: 'var(--ds-base-1)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand flex-shrink-0" />
                <span className="text-[13px] font-semibold text-content-1">AI Analysis</span>
              </div>
              <p className="text-[14px] leading-relaxed text-content-2">{explanation}</p>
            </div>
          )}

          {/* Data notices */}
          {notices.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ds-text-3)' }}>
                Data Notices
              </p>
              <div className="space-y-1.5">
                {notices.map((n, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px]"
                    style={{
                      background: n.severity === 'warn' ? 'var(--ds-warning-muted)' : 'var(--ds-base-1)',
                      border: `1px solid ${n.severity === 'warn' ? 'var(--ds-warning-border)' : 'var(--ds-border-subtle)'}`,
                      color: n.severity === 'warn' ? 'var(--ds-text-2)' : 'var(--ds-text-2)',
                    }}
                  >
                    {n.severity === 'warn'
                      ? <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-px" style={{ color: '#d97706' }} />
                      : <Info className="h-4 w-4 flex-shrink-0 mt-px" style={{ color: 'var(--ds-text-3)' }} />
                    }
                    <span>
                      <code className="font-mono text-[12px] font-semibold text-content-1">{n.col}</code>
                      {' — '}{n.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column profile */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ds-text-3)' }}>
              Column Profile
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr style={{ background: 'var(--ds-base-2)', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                      {['Column', 'Type', 'Rows', 'Nulls', 'Unique', 'Range / Top value'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-content-3 whitespace-nowrap first:pl-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                    {stats.map(s => (
                      <tr key={s.name} className="hover:bg-base-1 transition-colors duration-[60ms]">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-content-1 max-w-[160px] truncate" title={s.name}>
                          {s.name}
                        </td>
                        <td className="px-4 py-2.5">
                          <TypeBadge type={s.type} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] text-content-2 tabular-nums">
                          {s.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <NullBar pct={s.nullPct} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] text-content-2 tabular-nums">
                          {s.unique.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-content-3 max-w-[220px] truncate">
                          {s.type === 'number' && s.min !== undefined ? (
                            <span className="font-mono text-[11px]">
                              <span className="text-content-3">min </span><span className="text-content-2">{fmt(s.min)}</span>
                              <span className="text-content-3"> · avg </span><span className="text-content-2">{fmt(s.mean!)}</span>
                              <span className="text-content-3"> · max </span><span className="text-content-2">{fmt(s.max!)}</span>
                            </span>
                          ) : s.type === 'date' ? (
                            <span className="font-mono text-[11px] text-content-2">{s.minDate} → {s.maxDate}</span>
                          ) : s.topValue ? (
                            <span>
                              <span className="font-mono text-content-2">"{s.topValue}"</span>
                              {s.topCount && s.count > 1 && (
                                <span className="text-content-3"> × {s.topCount} ({((s.topCount / s.count) * 100).toFixed(0)}%)</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      {tab === 'chart' && (
        <div className="p-5 space-y-3">
          {/* Axis config row */}
          {allCols.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-xl border border-border" style={{ background: 'var(--ds-base-1)' }}>
              <ColSelector label="X-axis" columns={allCols} value={xKey} onChange={setXKey} />
              <ColSelector
                label="Y-axis"
                columns={numericCols.length > 0 ? numericCols : allCols}
                value={yKey}
                onChange={setYKey}
              />
              {chartRec?.reason && (
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ds-text-3)' }}>
                  <span className="text-brand mr-1">✦</span>
                  {chartRec.reason}
                </p>
              )}
            </div>
          )}

          {/* Chart card — toolbar integrated like ResultsTable */}
          <div ref={chartContainerRef} className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--ds-base-0)' }}>
            {/* Toolbar */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0"
              style={{ background: 'var(--ds-base-1)' }}
            >
              <span className="text-[12px] text-content-3">
                <strong className="text-content-1 font-semibold">{data.length.toLocaleString()}</strong> rows ·{' '}
                <strong className="text-content-1 font-semibold">{allCols.length}</strong> columns
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadChart} className="h-7 gap-1.5 px-2.5 text-[11px]">
                  <Download className="h-3.5 w-3.5" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => setChartFullscreen(true)} className="h-7 gap-1.5 px-2.5 text-[11px]">
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expand
                </Button>
              </div>
            </div>
            {/* Chart body */}
            <div className="p-4" style={{ height: 420 }}>
              <ChartPanel
                data={data}
                chartRecommendation={chartRec}
                xKey={xKey || undefined}
                yKeys={yKey ? [yKey] : undefined}
              />
            </div>
          </div>

          {/* Fullscreen — portal into <main> so sidebar stays visible */}
          {chartFullscreen && mainEl && createPortal(
            <div
              className="absolute inset-0 z-50 flex flex-col"
              style={{ background: 'var(--ds-base-0)' }}
            >
              {/* Header */}
              <div
                className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-border"
                style={{ background: 'var(--ds-base-1)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[14px] font-semibold text-content-1 flex-shrink-0">Chart</span>
                  <span className="text-[12px] text-content-3 flex-shrink-0">
                    <strong className="text-content-1 font-semibold">{data.length.toLocaleString()}</strong> rows ·{' '}
                    <strong className="text-content-1 font-semibold">{allCols.length}</strong> columns
                  </span>
                  {chartRec?.reason && (
                    <span className="text-[12px] text-content-3 truncate hidden md:block">
                      <span className="text-brand mr-1">✦</span>{chartRec.reason}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const canvas = document.querySelector('[data-chart-fullscreen] canvas') as HTMLCanvasElement | null;
                      if (!canvas) return;
                      const url = canvas.toDataURL('image/png', 1.0);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'intelliquery_chart.png';
                      a.click();
                    }}
                    className="h-8 gap-1.5 px-3 text-[12px]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PNG
                  </Button>
                  <button
                    onClick={() => setChartFullscreen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Chart — fills all remaining height */}
              <div data-chart-fullscreen className="flex-1 min-h-0 p-8">
                <ChartPanel
                  data={data}
                  chartRecommendation={chartRec}
                  xKey={xKey || undefined}
                  yKeys={yKey ? [yKey] : undefined}
                />
              </div>
            </div>,
            mainEl
          )}
        </div>
      )}

      {/* ── Data ── */}
      {tab === 'data' && (
        <div style={{ height: 420 }}>
          <ResultsTable
            data={data}
            executionTime={executionTime}
            className="h-full border-0 rounded-none shadow-none"
          />
        </div>
      )}

      {/* ── SQL ── */}
      {tab === 'sql' && (
        <div style={{ height: 300 }}>
          <SQLDisplay sql={sql} />
        </div>
      )}
    </motion.div>
  );
}
