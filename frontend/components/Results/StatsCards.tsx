'use client';

import { Users, TrendingUp, BarChart3, Binary } from 'lucide-react';
import { useMemo } from 'react';

interface StatsCardsProps {
  data: Record<string, unknown>[];
}

export const StatsCards = ({ data }: StatsCardsProps) => {
  const telemetryMetrics = useMemo(() => {
    const totalRecords = data?.length || 0;
    if (totalRecords === 0) {
      return [
        { icon: Users, label: 'Rows Returned', value: '0', shift: 'Awaiting Run', color: 'text-primary' },
        { icon: TrendingUp, label: 'Average Value', value: '0.00', shift: 'No Data', color: 'text-emerald-400' },
        { icon: Binary, label: 'Highest Value', value: '—', shift: 'Static Shell', color: 'text-amber-400' },
      ];
    }

    const itemKeys = Object.keys(data[0]);
    const functionalNumericKeys = itemKeys.filter(key => 
      data.some(row => typeof row[key] === 'number' && !isNaN(row[key] as number))
    );

    let activeTargetLabel = "Row Baseline";
    let formattedAverage = "0.00";
    let formattedPeak = "—";
    let growthIndicator = "Symmetrical Profile";

    if (functionalNumericKeys.length > 0) {
      // Isolate the primary numeric aggregation layer column
      const trackingKey = functionalNumericKeys[functionalNumericKeys.length - 1];
      activeTargetLabel = trackingKey.replace(/_/g, ' ').toUpperCase();
      
      const numericalArray = data.map(row => Number(row[trackingKey]) || 0);
      const totalSum = numericalArray.reduce((acc, curr) => acc + curr, 0);
      const computedMean = totalSum / numericalArray.length;
      const calculatedMax = Math.max(...numericalArray);

      formattedAverage = computedMean.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      });
      formattedPeak = calculatedMax.toLocaleString();

      if (calculatedMax > computedMean * 1.5) {
        growthIndicator = "Above normal range";
      } else {
        growthIndicator = "Within expected range";
      }
    } else {
      const stringColumns = itemKeys.filter(k => typeof data[0][k] === 'string');
      if (stringColumns.length > 0) {
        activeTargetLabel = `UNIQUE ${stringColumns[0].toUpperCase()}`;
        const totalUniqueSets = new Set(data.map(r => String(r[stringColumns[0]] || ''))).size;
        formattedAverage = `${totalUniqueSets} sets`;
        growthIndicator = "Categorical Mapping";
      }
    }

    return [
      {
        icon: Users,
        label: 'Rows Returned',
        value: totalRecords.toLocaleString(),
        shift: `${itemKeys.length} active fields`,
        color: 'text-primary'
      },
      {
        icon: TrendingUp,
        label: `Mean: ${activeTargetLabel}`,
        value: formattedAverage,
        shift: growthIndicator,
        color: 'text-emerald-400'
      },
      {
        icon: BarChart3,
        label: 'Peak Value',
        value: formattedPeak,
        shift: 'Upper bound boundary',
        color: 'text-amber-400'
      }
    ];
  }, [data]);

 return (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {telemetryMetrics.map((stat, idx) => (
      <div
        key={idx}
        className="group rounded-2xl border border-white/[0.06] bg-[#101012] p-4 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#141416]"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium tracking-wide text-slate-500">
              {stat.label}
            </span>
          </div>

          <div className="rounded-lg bg-white/[0.03] p-2 transition-colors duration-200 group-hover:bg-white/[0.05]">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight text-slate-100">
            {stat.value}
          </p>

          <p className="text-xs text-slate-500">
            {stat.shift}
          </p>
        </div>
      </div>
    ))}
  </div>
);
};