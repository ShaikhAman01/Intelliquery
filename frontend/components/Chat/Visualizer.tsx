import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, LineChartIcon, PieChartIcon, TrendingUp, LayoutGrid,
  Maximize2, Minimize2, Download, ImageDown, Table as TableIcon,
  ArrowDownNarrowWide, ArrowUpWideNarrow, Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';

// ── Color palette (dark-theme friendly) ─────────────────────────────────
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
  '#38bdf8', '#22d3ee', '#2dd4bf', '#34d399',
  '#fbbf24', '#f97316', '#fb7185', '#f472b6',
];

const GRID_COLOR = 'rgba(148, 163, 184, 0.08)';
const AXIS_COLOR = '#64748b';
const TOOLTIP_BG = '#1e293b';
const TOOLTIP_BORDER = '#334155';

// ── Types ───────────────────────────────────────────────────────────────
type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'area' | 'table';

interface ChartPanelProps {
  data: Record<string, unknown>[];
  chartRecommendation?: { chart_type: ChartType; reason?: string; };
}

// ── Chart Type Buttons ──────────────────────────────────────────────────
const CHART_TYPE_OPTIONS: { type: ChartType; icon: React.ElementType; label: string; }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar' },
  { type: 'line', icon: LineChartIcon, label: 'Line' },
  { type: 'area', icon: TrendingUp, label: 'Area' },
  { type: 'pie', icon: PieChartIcon, label: 'Pie' },
  { type: 'kpi', icon: LayoutGrid, label: 'KPI' },
  { type: 'table', icon: TableIcon, label: 'Table' },
];

// ── Tooltip (shared) ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-xl min-w-[120px]"
      style={{ background: TOOLTIP_BG, borderColor: TOOLTIP_BORDER }}>
      <p className="font-medium text-slate-300 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-400 truncate max-w-[150px]">{entry.name}:</span>
          <span className="font-medium text-slate-200 ml-auto">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────
export const ChartPanel = ({ data, chartRecommendation }: ChartPanelProps) => {
  const defaultType = chartRecommendation?.chart_type || 'bar';
  const [chartType, setChartType] = useState<ChartType>(defaultType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Controls state
  const [sortKey, setSortKey] = useState<string>('none');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<string>('50');

  // Reset state when data changes
  useEffect(() => {
    setSortKey('none');
    setSortDir('desc');
    setLimit('50');
    setChartType(chartRecommendation?.chart_type || 'bar');
  }, [data, chartRecommendation]);

  // Derive keys
  const { keys, xKey, numericKeys } = useMemo(() => {
    if (!data?.length) return { keys: [], xKey: '', numericKeys: [] };
    const k = Object.keys(data[0]);
    const nk = k.filter(key =>
      data.some(row => typeof row[key] === 'number' && !isNaN(row[key] as number))
    );
    return { keys: k, xKey: k[0], numericKeys: nk.length > 0 ? nk : k.slice(1) };
  }, [data]);

  // Processed Data
  const processedData = useMemo(() => {
    if (!data?.length) return [];
    let result = [...data];

    // Sort
    if (sortKey && sortKey !== 'none') {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    // Limit
    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum < result.length) {
      result = result.slice(0, limitNum);
    }

    return result;
  }, [data, sortKey, sortDir, limit]);

  // Fullscreen toggle
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

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!processedData?.length) return;
    const headers = Object.keys(processedData[0]).join(',');
    const rows = processedData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelliquery-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processedData]);

  // Export PNG
  const exportPNG = useCallback(() => {
    const svg = containerRef.current?.querySelector('.recharts-wrapper svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = '#0f172a';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `intelliquery-chart-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="p-4 rounded-full bg-primary/10 text-primary"
        >
          <BarChart3 className="h-8 w-8 opacity-80" />
        </motion.div>
        <p className="text-sm">Run a query to visualize results</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}
      className={`flex flex-col h-full ${isFullscreen ? 'bg-background p-6 z-[100] fixed inset-0' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {/* Chart type selector */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 mr-2">
            {CHART_TYPE_OPTIONS.map(({ type, icon: Icon, label }) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setChartType(type)}
                title={label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${chartType === type
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </motion.button>
            ))}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-[120px] h-8 text-xs border-dashed">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default order</SelectItem>
                {keys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sortKey !== 'none' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortDir}`}
              >
                {sortDir === 'desc' ? <ArrowDownNarrowWide className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Limit Control */}
          <div className="hidden sm:block">
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[90px] h-8 text-xs border-dashed">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
                <SelectItem value="0">All Rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {chartRecommendation?.reason && (
            <span className="text-[10px] text-muted-foreground mr-2 hidden md:inline">
              💡 {chartRecommendation.reason}
            </span>
          )}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportCSV} title="Export CSV">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
          {chartType !== 'table' && chartType !== 'kpi' && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportPNG} title="Export PNG">
                <ImageDown className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title="Toggle fullscreen">
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {chartType === 'bar' && <BarChartView data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'line' && <LineChartView data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'area' && <AreaChartView data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'pie' && <PieChartView data={processedData} xKey={xKey} numericKeys={numericKeys} />}
            {chartType === 'kpi' && <KPIView data={processedData} keys={keys} />}
            {chartType === 'table' && <TableView data={processedData} keys={keys} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Shared axis/grid props ──────────────────────────────────────────────
const axisProps = {
  stroke: AXIS_COLOR,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

// ── Bar Chart ───────────────────────────────────────────────────────────
function BarChartView({ data, xKey, numericKeys }: { data: any[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Line Chart ──────────────────────────────────────────────────────────
function LineChartView({ data, xKey, numericKeys }: { data: any[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Area Chart ──────────────────────────────────────────────────────────
function AreaChartView({ data, xKey, numericKeys }: { data: any[]; xKey: string; numericKeys: string[]; }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {numericKeys.map((key, i) => (
            <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />}
        {numericKeys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${i})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Pie Chart ───────────────────────────────────────────────────────────
function PieChartView({ data, xKey, numericKeys }: { data: any[]; xKey: string; numericKeys: string[]; }) {
  const valueKey = numericKeys[0] || Object.keys(data[0])[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius="75%"
          innerRadius="40%"
          strokeWidth={2}
          stroke="#0f172a"
          label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
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

// ── KPI Cards ───────────────────────────────────────────────────────────
function KPIView({ data, keys }: { data: any[]; keys: string[]; }) {
  // Use first row for KPI values
  const row = data[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full content-center">
      {keys.map((key, i) => {
        const val = row[key];
        const isNum = typeof val === 'number';
        return (
          <Card key={key}
            className="p-5 border-border bg-gradient-to-br from-card to-muted/20 flex flex-col justify-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-2xl font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
              {isNum ? val.toLocaleString() : String(val ?? '—')}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

// ── Table View ──────────────────────────────────────────────────────────
function TableView({ data, keys }: { data: any[]; keys: string[]; }) {
  return (
    <div className="h-full overflow-auto rounded-lg border border-border">
      <table className="results-table w-full">
        <thead className="sticky top-0">
          <tr>
            {keys.map(key => (
              <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="transition-colors duration-150 hover:bg-muted/20 border-t border-border/50">
              {keys.map(key => (
                <td key={key} className="px-4 py-3 text-sm text-foreground">
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