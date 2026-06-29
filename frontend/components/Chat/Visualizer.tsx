'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/components/Providers/ThemeProvider';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BarChart3,
  LineChart as LineChartIcon,
  TrendingUp,
  PieChart,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';

/* ── Register Chart.js ──────────────────────────────────────── */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

/* ── Types ──────────────────────────────────────────────────── */
type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';
type Row = Record<string, unknown>;

interface ChartPanelProps {
  data: Row[];
  chartRecommendation?: { chart_type: string; reason?: string };
  xKey?: string;
  yKeys?: string[];
}

/* ── Colour palettes ────────────────────────────────────────── */
const LIGHT_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626',
  '#7c3aed', '#0d9488', '#db2777', '#ea580c',
  '#0891b2', '#9333ea', '#b45309', '#0f766e',
];
const DARK_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#f87171',
  '#a78bfa', '#34d399', '#f472b6', '#fb923c',
  '#22d3ee', '#c084fc', '#fbbf24', '#2dd4bf',
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Chart type selector config ─────────────────────────────── */
const CHART_TYPES: { type: ChartType; Icon: React.ElementType; label: string }[] = [
  { type: 'bar',   Icon: BarChart3,     label: 'Bar'   },
  { type: 'line',  Icon: LineChartIcon, label: 'Line'  },
  { type: 'area',  Icon: TrendingUp,    label: 'Area'  },
  { type: 'pie',   Icon: PieChart,      label: 'Donut' },
  { type: 'kpi',   Icon: LayoutGrid,    label: 'KPI'   },
  { type: 'table', Icon: TableIcon,     label: 'Table' },
];

/* ── Derive chart data ──────────────────────────────────────── */
function deriveChartData(data: Row[], xKey?: string, yKeys?: string[]) {
  if (!data?.length) return { labels: [], numericCols: [], labelCol: '' };
  const cols = Object.keys(data[0]);
  const autoNumericCols = cols.filter((c) =>
    data.some((r) => typeof r[c] === 'number' && !isNaN(Number(r[c])))
  );
  const numericCols = yKeys
    ? yKeys.filter(k => cols.includes(k))
    : autoNumericCols;
  const labelCol = xKey ||
    cols.find((c) => typeof data[0][c] === 'string' && !autoNumericCols.includes(c)) ||
    cols[0];
  const labels = data.map((r) => String(r[labelCol] ?? ''));
  return { labels, numericCols, labelCol };
}

/* ── Type pill selector ─────────────────────────────────────── */
function TypeSelector({
  active,
  onChange,
}: {
  active: ChartType;
  onChange: (t: ChartType) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {CHART_TYPES.map(({ type, Icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium',
            'transition-colors duration-[100ms] select-none',
            active === type
              ? 'bg-brand text-white shadow-sm'
              : 'bg-base-2 text-content-2 hover:bg-base-3 hover:text-content-1 border border-border',
          ].join(' ')}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Main chart panel ───────────────────────────────────────── */
export function ChartPanel({ data, chartRecommendation, xKey, yKeys }: ChartPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* Derive default chart type */
  const defaultType: ChartType = useMemo(() => {
    if (!data?.length) return 'bar';
    if (data.length === 1) return 'kpi';
    const rec = chartRecommendation?.chart_type as ChartType | undefined;
    return rec || 'bar';
  }, [data, chartRecommendation]);

  const [activeType, setActiveType] = useState<ChartType>(defaultType);

  /* Sync type when recommendation or data changes */
  useEffect(() => {
    setActiveType(defaultType);
  }, [defaultType]);

  /* Theme-dependent palette */
  const colors     = isDark ? DARK_COLORS : LIGHT_COLORS;
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const axisColor  = isDark ? '#5e5e6a' : '#94a3b8';
  const ttBg       = isDark ? 'rgba(20,20,23,0.96)' : 'rgba(255,255,255,0.98)';
  const ttBorder   = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const ttTitle    = isDark ? '#ededef' : '#0f172a';
  const ttBody     = isDark ? '#9494a0' : '#64748b';

  const { labels, numericCols } = useMemo(() => deriveChartData(data, xKey, yKeys), [data, xKey, yKeys]);

  /* Shared tooltip config */
  const tooltipPlugin = useMemo(() => ({
    backgroundColor: ttBg,
    borderColor: ttBorder,
    borderWidth: 1,
    titleColor: ttTitle,
    bodyColor: ttBody,
    padding: { x: 12, y: 10 },
    cornerRadius: 8,
    displayColors: true,
    boxWidth: 8,
    boxHeight: 8,
    callbacks: {
      label: (ctx: TooltipItem<'bar' | 'line'>) =>
        ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
    },
  }), [ttBg, ttBorder, ttTitle, ttBody]);

  /* Shared axis config */
  const scales = useMemo(() => ({
    x: {
      grid:   { color: gridColor, lineWidth: 1 },
      ticks:  {
        color: axisColor,
        font: { size: 11 as const },
        maxTicksLimit: 10,
        maxRotation: 45,
        minRotation: 0,
        callback(val: unknown) {
          const label = labels[val as number] ?? String(val);
          return typeof label === 'string' && label.length > 16
            ? label.slice(0, 16) + '…'
            : label;
        },
      },
      border: { display: false as const },
    },
    y: {
      grid:   { color: gridColor, lineWidth: 1 },
      ticks:  { color: axisColor, font: { size: 11 as const } },
      border: { display: false as const },
    },
  }), [gridColor, axisColor, labels]);

  /* Legend config */
  const legendPlugin = useMemo(() => ({
    display: numericCols.length > 1,
    labels: {
      color: axisColor,
      font: { size: 11 as const },
      boxWidth: 8,
      boxHeight: 8,
      padding: 16,
      usePointStyle: true,
    },
  }), [axisColor, numericCols.length]);

  /* ── Empty state ── */
  if (!data?.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data to visualize"
        description="Run a query to see a chart here."
        size="md"
      />
    );
  }

  /* ── Bar chart ── */
  if (activeType === 'bar') {
    const chartData = {
      labels,
      datasets: numericCols.slice(0, 8).map((col, i) => ({
        label: col.replace(/_/g, ' '),
        data: data.map((r) => Number(r[col]) || 0),
        backgroundColor: hexToRgba(colors[i % colors.length], 0.88),
        borderColor: colors[i % colors.length],
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false as const,
        hoverBackgroundColor: colors[i % colors.length],
      })),
    };
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div className="flex-1 min-h-0">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 450 },
              plugins: { legend: legendPlugin, tooltip: tooltipPlugin },
              scales,
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Line chart ── */
  if (activeType === 'line') {
    const chartData = {
      labels,
      datasets: numericCols.slice(0, 6).map((col, i) => ({
        label: col.replace(/_/g, ' '),
        data: data.map((r) => Number(r[col]) || 0),
        borderColor: colors[i % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: data.length > 30 ? 0 : 3.5,
        pointHoverRadius: 5,
        pointBackgroundColor: colors[i % colors.length],
        pointBorderColor: isDark ? '#141417' : '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4,
      })),
    };
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div className="flex-1 min-h-0">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 450 },
              plugins: { legend: legendPlugin, tooltip: tooltipPlugin },
              scales,
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Area chart ── */
  if (activeType === 'area') {
    const chartData = {
      labels,
      datasets: numericCols.slice(0, 4).map((col, i) => ({
        label: col.replace(/_/g, ' '),
        data: data.map((r) => Number(r[col]) || 0),
        borderColor: colors[i % colors.length],
        backgroundColor: hexToRgba(colors[i % colors.length], isDark ? 0.18 : 0.12),
        borderWidth: 2.5,
        pointRadius: data.length > 30 ? 0 : 3,
        pointHoverRadius: 4,
        pointBackgroundColor: colors[i % colors.length],
        tension: 0.4,
        fill: true,
      })),
    };
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div className="flex-1 min-h-0">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 450 },
              plugins: { legend: legendPlugin, tooltip: tooltipPlugin },
              scales,
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Doughnut / Pie ── */
  if (activeType === 'pie') {
    const col = numericCols[0] || Object.keys(data[0])[0];
    const slice = data.slice(0, 10);
    const vals = slice.map((r) => Number(r[col]) || 0);
    const sliceColors = colors.slice(0, vals.length);
    const chartData = {
      labels: slice.map((r) => String(r[Object.keys(data[0]).find(k => typeof data[0][k] === 'string') || Object.keys(data[0])[0]] ?? '')),
      datasets: [{
        data: vals,
        backgroundColor: sliceColors.map((c) => hexToRgba(c, 0.88)),
        borderColor: isDark ? '#141417' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
        hoverBorderWidth: 0,
      }],
    };
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full h-full" style={{ maxWidth: 420 }}>
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 450 },
                cutout: '62%',
                plugins: {
                  legend: {
                    position: 'right' as const,
                    labels: {
                      color: axisColor,
                      font: { size: 11 as const },
                      boxWidth: 10,
                      boxHeight: 10,
                      padding: 12,
                      usePointStyle: true,
                    },
                  },
                  tooltip: {
                    backgroundColor: ttBg,
                    borderColor: ttBorder,
                    borderWidth: 1,
                    titleColor: ttTitle,
                    bodyColor: ttBody,
                    padding: { x: 12, y: 10 },
                    cornerRadius: 8,
                    callbacks: {
                      label: (ctx: TooltipItem<'doughnut'>) =>
                        ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── KPI cards ── */
  if (activeType === 'kpi') {
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          {numericCols.slice(0, 6).map((col, i) => {
            const vals = data.map((r) => Number(r[col]) || 0);
            const value =
              vals.length === 1
                ? vals[0]
                : vals.reduce((a, b) => a + b, 0) / vals.length;
            return (
              <div
                key={col}
                className="flex flex-col gap-2 rounded-lg border border-border bg-base-1 p-4"
                style={{ boxShadow: 'var(--ds-shadow-sm)' }}
              >
                <span className="text-[11px] font-semibold text-content-3 uppercase tracking-wide truncate">
                  {col.replace(/_/g, ' ')}
                </span>
                <span
                  className="text-[26px] font-bold tracking-tight leading-none"
                  style={{ color: colors[i % colors.length] }}
                >
                  {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-content-3">
                  {vals.length === 1 ? 'single record' : `avg of ${vals.length} records`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Table view ── */
  if (activeType === 'table') {
    const cols = Object.keys(data[0]);
    return (
      <div className="flex flex-col h-full gap-3">
        <TypeSelector active={activeType} onChange={setActiveType} />
        <div
          className="flex-1 min-h-0 overflow-auto rounded-md border border-border"
          style={{ boxShadow: 'var(--ds-shadow-inset)' }}
        >
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-base-2 select-none">
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2.5 font-medium text-content-3 whitespace-nowrap">
                    {c.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {data.slice(0, 100).map((row, ri) => (
                <tr
                  key={ri}
                  className="hover:bg-base-2 transition-colors duration-[100ms]"
                >
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 text-content-2 font-mono whitespace-nowrap">
                      {String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

/* Keep legacy default export for any other imports */
export { ChartPanel as default };
