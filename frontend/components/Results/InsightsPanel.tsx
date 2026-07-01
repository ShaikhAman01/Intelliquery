"use client";

import { Sparkles, AlertCircle, CheckCircle2, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { StatsCards } from "./StatsCards";
import { EmptyState } from "@/components/ui/empty-state";

interface InsightsPanelProps {
  data: Record<string, unknown>[];
  explanation?: string;
  insights?: any;
}

export const InsightsPanel = ({ data, explanation, insights }: InsightsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No insights yet"
        description="Run a query to see AI-generated insights here."
        size="sm"
        className="h-full"
      />
    );
  }

  /* ── Statistical engine ──────────────────────────────────── */
  const telemetry = useMemo(() => {
    const keys = Object.keys(data[0]);
    const totalCells = data.length * keys.length;

    let nullCount = 0;
    const numericMetrics: Record<string, { sum: number; values: number[]; max: number; min: number }> = {};

    data.forEach((row) => {
      keys.forEach((key) => {
        const val = row[key];
        if (val === null || val === undefined || val === "") nullCount++;
        if (typeof val === "number" && !isNaN(val)) {
          if (!numericMetrics[key]) {
            numericMetrics[key] = { sum: 0, values: [], max: -Infinity, min: Infinity };
          }
          numericMetrics[key].sum += val;
          numericMetrics[key].values.push(val);
          if (val > numericMetrics[key].max) numericMetrics[key].max = val;
          if (val < numericMetrics[key].min) numericMetrics[key].min = val;
        }
      });
    });

    const quality = totalCells > 0 ? Math.round(((totalCells - nullCount) / totalCells) * 100) : 100;
    const numericKeys = Object.keys(numericMetrics);
    const metricKeys = numericKeys.filter(k => !/(phone|mobile|tel|zip|postal|pin|ssn|fax|^id$|_id$)/i.test(k));
    const focusKey = (metricKeys.length > 0 ? metricKeys : numericKeys).slice(-1)[0] || null;

    let computedAverage = 0;
    let computedPeak = 0;
    let anomalyScore = 0;

    if (focusKey) {
      const stats = numericMetrics[focusKey];
      computedAverage = stats.sum / stats.values.length;
      computedPeak = stats.max;

      if (stats.values.length > 2) {
        const avg = computedAverage;
        const variance = stats.values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / stats.values.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > 0) {
          anomalyScore = stats.values.filter((v) => Math.abs(v - avg) > 1.5 * stdDev).length;
        }
      }
    }

    return {
      quality,
      nulls: nullCount,
      targetMetric: focusKey ? focusKey.replace(/_/g, " ") : "Records",
      average: computedAverage,
      peak: computedPeak,
      anomaliesFound: anomalyScore,
      keys,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 h-full overflow-y-auto custom-scrollbar pr-0.5">

      {/* ── Left: analysis + stats + KPIs + alert ─────────── */}
      <div className="space-y-4">

        {/* AI Analysis summary */}
        <div className="rounded-lg border border-border bg-base-2 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Analysis</span>
          </div>
          <p className="text-[13px] leading-relaxed text-content-2">
            {insights?.summary || explanation ||
              "Analysis complete. Key metrics were identified from the current dataset."}
          </p>
        </div>

        <StatsCards data={data} />

        {/* Live KPI tiles */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Primary Metric",
              value: telemetry.targetMetric,
              color: "text-content-1",
              small: false,
            },
            {
              label: "Average Value",
              value: telemetry.average > 0
                ? telemetry.average.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : String(telemetry.peak || data.length),
              color: "text-success",
              small: true,
            },
            {
              label: "Highest Value",
              value: telemetry.peak > 0 ? telemetry.peak.toLocaleString() : "Uniform",
              color: "text-warning",
              small: true,
            },
          ].map(({ label, value, color, small }) => (
            <div key={label} className="rounded-lg border border-border bg-base-2 p-3.5">
              <span className="text-[11px] font-medium text-content-3 uppercase tracking-wider block mb-1.5">
                {label}
              </span>
              <p className={`font-semibold truncate ${color} ${small ? 'text-[18px]' : 'text-[13px]'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Distribution alert */}
        {telemetry.anomaliesFound > 0 ? (
          <div
            className="flex items-start gap-2.5 rounded-lg p-3.5"
            style={{ background: 'var(--ds-warning-muted)', border: '1px solid var(--ds-warning-border)' }}
          >
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-[12px]">
              <span className="text-warning font-semibold uppercase tracking-wide block">
                Anomaly Detected
              </span>
              <p className="text-content-2 mt-0.5">
                {telemetry.anomaliesFound} value{telemetry.anomaliesFound !== 1 ? 's' : ''} fall outside the expected statistical range.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-base-2 p-3.5">
            <CheckCircle2 className="h-4 w-4 text-content-3 flex-shrink-0 mt-0.5" />
            <div className="text-[12px]">
              <span className="text-content-2 font-semibold block">Normal Distribution</span>
              <p className="text-content-3 mt-0.5">
                No major anomalies detected in this dataset.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: quality scorecard ───────────────────────── */}
      <div className="rounded-lg border border-border bg-base-2 p-5 space-y-5 h-fit">

        {/* Progress */}
        <div>
          <span className="block mb-2.5 text-[11px] font-medium tracking-wide text-content-3 uppercase">
            Data Quality
          </span>
          <div className="mb-2 flex items-center justify-between text-[12px] font-medium">
            <span className="text-content-2">Completeness</span>
            <span className="text-content-1">{telemetry.quality}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-4">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-700"
              style={{ width: `${telemetry.quality}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 border-t border-border pt-4 text-[12px]">
          {[
            { label: "Rows Returned", value: data.length.toLocaleString() },
            { label: "Columns", value: telemetry.keys.length },
            { label: "Missing Values", value: telemetry.nulls },
            {
              label: "Anomalies",
              value: telemetry.anomaliesFound,
              valueClass: telemetry.anomaliesFound > 0 ? "text-warning" : "text-success",
            },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-content-3">{label}</span>
              <span className={`font-medium text-content-1 ${valueClass ?? ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
