'use client';

import { useMemo } from 'react';
import { Rows3, TrendingUp, BarChart3, Hash } from 'lucide-react';

interface StatsCardsProps {
  data: Record<string, unknown>[];
  executionTime?: number;
}

interface KPICard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent: string;
  trend?: { label: string; up: boolean };
}

export const StatsCards = ({ data, executionTime }: StatsCardsProps) => {
  const cards = useMemo<KPICard[]>(() => {
    const totalRows = data?.length ?? 0;
    const cols = totalRows > 0 ? Object.keys(data[0]) : [];
    const numericCols = cols.filter((k) =>
      data.some((r) => typeof r[k] === 'number' && !isNaN(r[k] as number))
    );

    if (totalRows === 0) {
      return [
        { label: 'Total Rows',   value: '—', sub: 'Awaiting query',  icon: Rows3,      accent: '#2563eb', },
        { label: 'Mean Value',   value: '—', sub: 'No numeric data',  icon: TrendingUp, accent: '#15803d', },
        { label: 'Peak Value',   value: '—', sub: 'No numeric data',  icon: BarChart3,  accent: '#d97706', },
      ];
    }

    let meanLabel = 'Mean';
    let meanValue = '—';
    let peakValue = '—';
    let peakSub   = 'Upper bound';

    if (numericCols.length > 0) {
      const col  = numericCols[numericCols.length - 1];
      meanLabel  = col.replace(/_/g, ' ');
      const nums = data.map((r) => Number(r[col]) || 0);
      const avg  = nums.reduce((a, b) => a + b, 0) / nums.length;
      const peak = Math.max(...nums);
      meanValue  = avg.toLocaleString(undefined, { maximumFractionDigits: 2 });
      peakValue  = peak.toLocaleString();
      peakSub    = peak > avg * 1.5 ? 'Above mean range' : 'Within expected range';
    } else if (cols.length > 0) {
      const strCol = cols.find((k) => typeof data[0][k] === 'string');
      if (strCol) {
        meanLabel = strCol.replace(/_/g, ' ');
        meanValue = `${new Set(data.map((r) => String(r[strCol] || ''))).size}`;
        peakSub   = 'Unique values';
      }
    }

    return [
      {
        label: 'Total Rows',
        value: totalRows.toLocaleString(),
        sub: `${cols.length} column${cols.length !== 1 ? 's' : ''}`,
        icon: Rows3,
        accent: '#2563eb',
        trend: executionTime !== undefined
          ? { label: `${executionTime}ms`, up: executionTime < 200 }
          : undefined,
      },
      {
        label: `Mean · ${meanLabel}`,
        value: meanValue,
        sub: 'Average across dataset',
        icon: TrendingUp,
        accent: '#15803d',
      },
      {
        label: 'Peak Value',
        value: peakValue,
        sub: peakSub,
        icon: BarChart3,
        accent: '#d97706',
      },
    ];
  }, [data, executionTime]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="relative flex flex-col gap-3 rounded-xl border border-border bg-base-0 p-5 overflow-hidden"
            style={{ boxShadow: 'var(--ds-shadow-sm)' }}
          >
            {/* Accent left stripe */}
            <div
              className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full"
              style={{ background: card.accent }}
            />

            {/* Header row */}
            <div className="flex items-start justify-between pl-3">
              <span className="text-[11px] font-semibold text-content-3 uppercase tracking-wider leading-none truncate max-w-[80%]">
                {card.label}
              </span>
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${card.accent}14` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: card.accent }} />
              </div>
            </div>

            {/* Value */}
            <div className="pl-3">
              <p className="text-[28px] font-bold tracking-tight text-content-1 leading-none">
                {card.value}
              </p>
              <p className="mt-1.5 text-[12px] text-content-3">{card.sub}</p>
            </div>

            {/* Optional trend badge */}
            {card.trend && (
              <div className="pl-3">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
                  style={
                    card.trend.up
                      ? { background: 'var(--ds-success-muted)', color: 'var(--ds-success)' }
                      : { background: 'var(--ds-warning-muted)', color: 'var(--ds-warning)' }
                  }
                >
                  <Hash className="h-3 w-3" />
                  {card.trend.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
