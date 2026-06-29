'use client';

import { Users, TrendingUp, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';

interface StatsCardsProps {
  data: Record<string, unknown>[];
}

export const StatsCards = ({ data }: StatsCardsProps) => {
  const metrics = useMemo(() => {
    const totalRecords = data?.length || 0;

    if (totalRecords === 0) {
      return [
        { icon: Users,    label: 'Rows Returned', value: '0',    sub: 'Awaiting run',     color: 'text-brand' },
        { icon: TrendingUp, label: 'Average Value', value: '0.00', sub: 'No data',          color: 'text-success' },
        { icon: BarChart3,  label: 'Highest Value', value: '—',    sub: 'Static shell',     color: 'text-warning' },
      ];
    }

    const itemKeys = Object.keys(data[0]);
    const numericKeys = itemKeys.filter((k) =>
      data.some((r) => typeof r[k] === 'number' && !isNaN(r[k] as number))
    );

    let activeLabel = 'Row Baseline';
    let formattedAvg = '0.00';
    let formattedPeak = '—';
    let growthNote = 'Symmetrical profile';

    if (numericKeys.length > 0) {
      const key = numericKeys[numericKeys.length - 1];
      activeLabel = key.replace(/_/g, ' ').toUpperCase();
      const nums = data.map((r) => Number(r[key]) || 0);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const peak = Math.max(...nums);
      formattedAvg = mean.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
      formattedPeak = peak.toLocaleString();
      growthNote = peak > mean * 1.5 ? 'Above normal range' : 'Within expected range';
    } else {
      const strCols = itemKeys.filter((k) => typeof data[0][k] === 'string');
      if (strCols.length > 0) {
        activeLabel = `UNIQUE ${strCols[0].toUpperCase()}`;
        formattedAvg = `${new Set(data.map((r) => String(r[strCols[0]] || ''))).size} sets`;
        growthNote = 'Categorical mapping';
      }
    }

    return [
      {
        icon: Users,
        label: 'Rows Returned',
        value: totalRecords.toLocaleString(),
        sub: `${itemKeys.length} active fields`,
        color: 'text-brand',
      },
      {
        icon: TrendingUp,
        label: `Mean: ${activeLabel}`,
        value: formattedAvg,
        sub: growthNote,
        color: 'text-success',
      },
      {
        icon: BarChart3,
        label: 'Peak Value',
        value: formattedPeak,
        sub: 'Upper bound',
        color: 'text-warning',
      },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((stat, idx) => (
        <div
          key={idx}
          className="group rounded-lg border border-border bg-base-2 p-4 hover:border-[var(--ds-border-moderate)] transition-[border-color] duration-[100ms]"
        >
          <div className="mb-3 flex items-start justify-between">
            <span className="text-[11px] font-medium tracking-wide text-content-3 uppercase">
              {stat.label}
            </span>
            <div className="rounded-md bg-base-3 p-1.5 transition-colors duration-[100ms] group-hover:bg-base-4">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[22px] font-semibold tracking-tight text-content-1">
              {stat.value}
            </p>
            <p className="text-[12px] text-content-3">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
