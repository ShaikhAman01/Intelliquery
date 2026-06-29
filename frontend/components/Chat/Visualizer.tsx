import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  BarChart3, LineChartIcon, PieChartIcon, TrendingUp, LayoutGrid,
  Maximize2, Minimize2, Download, ImageDown, Table as TableIcon,
  ArrowDownNarrowWide, ArrowUpWideNarrow, Filter,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from 'motion/react';

/* ── Design-aligned chart palette ──────────────────────────────────────
   Order matches: brand → success → warning → error → info → extended  */
const CHART_COLORS = [
  '#3b82f6',  // Blue (accent-hover)
  '#22c55e',  // Green (success)
  '#f59e0b',  // Amber (warning)
  '#f87171',  // Red (error)
  '#60a5fa',  // Light blue (info)
  '#e879f9',  // Fuchsia (chart-6)
  '#34d399',  // Emerald
  '#fbbf24',  // Yellow
  '#f97316',  // Orange
  '#22d3ee',  // Cyan
  '#a78bfa',  // Violet
  '#fb7185',  // Rose
];

/* Recharts expects hex, not CSS vars */
const GRID_COLOR   = 'rgba(255,255,255,0.05)';
const AXIS_COLOR   = '#5e5e6a';  /* --ds-text-3 */
const TOOLTIP_BG   = 'rgba(20,20,23,0.96)';  /* ~--ds-base-2 */
const TOOLTIP_BORDER = 'rgba(255,255,255,0.10)';  /* --ds-border-moderate */

/* ── Types ─────────────────────────────────────────────────────────── */
type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'area' | 'table';
type ChartRow  = Record<string, unknown>;

interface TooltipEntry { color?: string; name?: string; value?: unknown; }
interface TooltipProps  { active?: boolean; payload?: TooltipEntry[]; label?: unknown; }

interface ChartPanelProps {
  data: Record<string, unknown>[];
  chartRecommendation?: { chart_type: ChartType; reason?: string; };
}

/* ── Chart type button list ────────────────────────────────────────── */
const CHART_TYPE_OPTIONS: { type: ChartType; icon: React.ElementType; label: string; }[] = [
  { type: 'bar',   icon: BarChart3,      label: 'Bar'  },
  { type: 'line',  icon: LineChartIcon,  label: 'Line' },
  { type: 'area',  icon: TrendingUp,     label: 'Area' },
  { type: 'pie',   icon: PieChartIcon,   label: 'Pie'  },
  { type: 'kpi',   icon: LayoutGrid,     label: 'KPI'  },
  { type: 'table', icon: TableIcon,      label: 'Table'},
];

/* ── Shared tooltip ────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-[12px] min-w-[140px]"
      style={{ background: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, boxShadow: 'var(--ds-shadow-lg)' }}
    >
      <p className="font-mono font-semibold mb-1.5 pb-1 border-b border-[var(--ds-border-subtle)]"
        style={{ color: AXIS_COLOR }}>
        {String(label ?? '')}
      </p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="truncate max-w-[100px]" style={{ color: AXIS_COLOR }}>
              {entry.name ?? 'Value'}:
            </span>
            <span className="font-mono font-bold ml-auto" style={{ color: '#ededef' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : String(entry.value ?? '')}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};

/* ── Main component ────────────────────────────────────────────────── */
export const ChartPanel = ({ data, chartRecommendation }: ChartPanelProps) => {
  const defaultType: ChartType = data.length === 1 ? 'kpi' : (chartRecommendation?.chart_type || 'bar');
  const [chartType, setChartType] = useState<ChartType>(defaultType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [sortKey, setSortKey]   = useState<string>('none');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit]       = useState<string>('50');

  const { keys, xKey, numericKeys } = useMemo(() => {
    if (!data?.length) return { keys: [], xKey: '', numericKeys: [] };
    const k = Object.keys(data[0]);
    const nk = k.filter((key) => data.some((r) => typeof r[key] === 'number' && !isNaN(r[key] as number)));
    return { keys: k, xKey: k[0], numericKeys: nk.length > 0 ? nk : k.slice(1) };
  }, [data]);

  const processedData = useMemo(() => {
    if (!data?.length) return [];
    let result = [...data];

    if (sortKey && sortKey !== 'none') {
      result.sort((a, b) => {
        const vA = a[sortKey]; const vB = b[sortKey];
        if (typeof vA === 'number' && typeof vB === 'number')
          return sortDir === 'asc' ? vA - vB : vB - vA;
        const sA = String(vA ?? ''); const sB = String(vB ?? '');
        return sortDir === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
      });
    }

    const n = parseInt(limit, 10);
    if (!isNaN(n) && n > 0 && n < result.length) result = result.slice(0, n);
    return result;
  }, [data, sortKey, sortDir, limit]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const exportCSV = useCallback(() => {
    if (!processedData?.length) return;
    const headers = Object.keys(processedData[0]).join(',');
    const rows = processedData.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `intelliquery-data-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [processedData]);

  const exportPNG = useCallback(() => {
    const svg = containerRef.current?.querySelector('.recharts-wrapper svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2; canvas.height = img.height * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = '#0f0f11';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `intelliquery-chart-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png'); a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const chartCanvasWidth = useMemo(() => {
    if (chartType === 'pie' || chartType === 'kpi' || chartType === 'table') return '100%';
    return Math.max(680, processedData.length * 64);
  }, [chartType, processedData.length]);

  if (!data?.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data to visualize"
        description="Run a query to see charts here."
        size="sm"
        className="h-full"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-[100] bg-base-0 p-6' : ''}`}
    >
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Chart type pills */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-base-2 p-0.5">
            {CHART_TYPE_OPTIONS.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                title={label}
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-medium',
                  'transition-[background-color,color] duration-[100ms]',
                  chartType === type
                    ? 'bg-base-4 text-content-1 border border-border'
                    : 'text-content-3 hover:bg-base-3 hover:text-content-2',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Sort control */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-content-3" />
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-[120px] h-7 text-[12px]">
                <SelectValue placeholder="Sort by…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default order</SelectItem>
                {keys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            {sortKey !== 'none' && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                title={`Currently ${sortDir}`}
              >
                {sortDir === 'desc'
                  ? <ArrowDownNarrowWide className="h-3.5 w-3.5" />
                  : <ArrowUpWideNarrow className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>

          {/* Limit control */}
          <div className="hidden sm:block">
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[88px] h-7 text-[12px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
                <SelectItem value="0">All rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          {chartRecommendation?.reason && (
            <span className="text-[10px] text-content-3 mr-2 hidden md:inline">
              {chartRecommendation.reason}
            </span>
          )}
          <Button variant="ghost" size="icon-sm" onClick={exportCSV} title="Export CSV">
            <Download className="h-3.5 w-3.5" />
          </Button>
          {chartType !== 'table' && chartType !== 'kpi' && (
            <Button variant="ghost" size="icon-sm" onClick={exportPNG} title="Export PNG">
              <ImageDown className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Chart area ────────────────────────────────────────── */}
      <div className="custom-scrollbar relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
            className="h-full"
            style={{ minWidth: chartCanvasWidth, width: chartCanvasWidth }}
          >
            {chartType === 'bar'   && <BarChartView   data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'line'  && <LineChartView  data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'area'  && <AreaChartView  data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'pie'   && <PieChartView   data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'kpi'   && <KPIView        data={processedData} keys={keys} />}
            {chartType === 'table' && <TableView      data={processedData} keys={keys} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Shared axis props ─────────────────────────────────────────────── */
const axisProps = {
  stroke: AXIS_COLOR,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tick: { fill: AXIS_COLOR },
};

const trim = (value: unknown) => {
  const s = String(value ?? '');
  return s.length > 14 ? `${s.slice(0, 12)}…` : s;
};

/* ── Bar ───────────────────────────────────────────────────────────── */
function BarChartView({ data, xKey, numericKeys }: { data: ChartRow[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 14, right: 16, bottom: 20, left: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={16} tickFormatter={trim} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Bar key={key} dataKey={key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.9}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeOpacity={0.6}
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Line ──────────────────────────────────────────────────────────── */
function LineChartView({ data, xKey, numericKeys }: { data: ChartRow[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 14, right: 16, bottom: 20, left: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={16} tickFormatter={trim} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5}
            connectNulls
            isAnimationActive={false}
            dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART_COLORS[i % CHART_COLORS.length] }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Area ──────────────────────────────────────────────────────────── */
function AreaChartView({ data, xKey, numericKeys }: { data: ChartRow[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 14, right: 16, bottom: 20, left: 8 }}>
        <defs>
          {numericKeys.map((key, i) => (
            <linearGradient key={key} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.40} />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={16} tickFormatter={trim} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#area-grad-${i})`}
            strokeWidth={2.5}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Pie ───────────────────────────────────────────────────────────── */
function PieChartView({ data, xKey, numericKeys }: { data: ChartRow[]; xKey: string; numericKeys: string[]; }) {
  const valueKey = numericKeys[0] || Object.keys(data[0])[1];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={xKey}
          cx="50%" cy="50%"
          outerRadius="75%" innerRadius="42%"
          strokeWidth={2}
          stroke="#0f0f11"
          isAnimationActive={false}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={{ stroke: AXIS_COLOR }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── KPI Cards ─────────────────────────────────────────────────────── */
function KPIView({ data, keys }: { data: ChartRow[]; keys: string[]; }) {
  const row = data[0];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full content-center">
      {keys.map((key, i) => {
        const val = row[key];
        const isNum = typeof val === 'number';
        return (
          <div
            key={key}
            className="flex flex-col justify-center rounded-lg border border-border bg-base-2 p-5 hover:border-[var(--ds-border-moderate)] transition-[border-color] duration-[100ms]"
          >
            <p className="text-[11px] font-medium text-content-3 uppercase tracking-wider mb-2">
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-[22px] font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
              {isNum ? val.toLocaleString() : String(val ?? '—')}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Table View ────────────────────────────────────────────────────── */
function TableView({ data, keys }: { data: ChartRow[]; keys: string[]; }) {
  return (
    <div
      className="h-full overflow-auto rounded-md border border-border bg-base-0 custom-scrollbar"
      style={{ boxShadow: 'var(--ds-shadow-inset)' }}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            {keys.map((key) => (
              <th
                key={key}
                className="border-b border-border bg-base-2 px-3 py-2.5 text-left text-[11px] font-medium text-content-3 uppercase tracking-wide whitespace-nowrap"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-base-2 transition-colors duration-[100ms]">
              {keys.map((key) => (
                <td key={key} className="px-3 py-2.5 text-[12px] text-content-1 font-mono whitespace-nowrap">
                  {typeof row[key] === 'number' ? (row[key] as number).toLocaleString() : String(row[key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
