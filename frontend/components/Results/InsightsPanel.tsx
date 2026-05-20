"use client";

import { Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { useMemo } from "react";
import { StatsCards } from "./StatsCards";

interface InsightsPanelProps {
  data: Record<string, unknown>[];
  explanation?: string;
  insights?: any;
}

export const InsightsPanel = ({
  data,
  explanation,
  insights,
}: InsightsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        -- Operational data frame empty. Execute query to evaluate profiles.
      </div>
    );
  }

  // ── Mathematical Engine (Processes database entries on the fly) ──
  const telemetry = useMemo(() => {
    const keys = Object.keys(data[0]);
    const totalCells = data.length * keys.length;

    let nullCount = 0;
    const numericMetrics: Record<
      string,
      { sum: number; values: number[]; max: number; min: number }
    > = {};

    data.forEach((row) => {
      keys.forEach((key) => {
        const val = row[key];
        if (val === null || val === undefined || val === "") {
          nullCount++;
        }
        if (typeof val === "number" && !isNaN(val)) {
          if (!numericMetrics[key]) {
            numericMetrics[key] = {
              sum: 0,
              values: [],
              max: -Infinity,
              min: Infinity,
            };
          }
          numericMetrics[key].sum += val;
          numericMetrics[key].values.push(val);
          if (val > numericMetrics[key].max) numericMetrics[key].max = val;
          if (val < numericMetrics[key].min) numericMetrics[key].min = val;
        }
      });
    });

    const dataQualityIndex =
      totalCells > 0
        ? Math.round(((totalCells - nullCount) / totalCells) * 100)
        : 100;
    const numericKeys = Object.keys(numericMetrics);

    // Choose primary numeric focus
    const focusKey = numericKeys[numericKeys.length - 1] || null;
    let computedAverage = 0;
    let computedPeak = 0;
    let anomalyScore = 0;

    if (focusKey) {
      const stats = numericMetrics[focusKey];
      computedAverage = stats.sum / stats.values.length;
      computedPeak = stats.max;

      // Find standard variance anomalies (items falling 1.5 deviations out from average)
      if (stats.values.length > 2) {
        const avg = computedAverage;
        const squareDiffs = stats.values.map((v) => Math.pow(v - avg, 2));
        const variance =
          squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 0) {
          anomalyScore = stats.values.filter(
            (v) => Math.abs(v - avg) > 1.5 * stdDev,
          ).length;
        }
      }
    }

    return {
      quality: dataQualityIndex,
      nulls: nullCount,
      targetMetric: focusKey ? focusKey.replace(/_/g, " ") : "Records Key",
      average: computedAverage,
      peak: computedPeak,
      anomaliesFound: anomalyScore,
      keys,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5 h-full overflow-y-auto custom-scrollbar pr-1">
      <div className="space-y-5">
        {/* Dynamic Context Block */}
        <div className="bg-[#0b0b0c]/60 rounded-2xl p-4 border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-xs text-purple-400 tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Analysis</span>
          </div>
          <p className="text-[13px] leading-6 text-slate-300">
            {insights?.summary ||
              explanation ||
              "Analysis complete. Query results processed successfully and key metrics were identified from the current dataset."}
          </p>
        </div>

        <StatsCards data={data} />

        {/* Live Mathematical Derived KPI Layer */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/[0.06] bg-[#131316] p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase block tracking-wider">
              Primary Metric
            </span>
            <p className="text-sm font-semibold text-slate-100 mt-1 truncate">
              {telemetry.targetMetric}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#131316] p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase block tracking-wider">
              Average Value
            </span>
            <p className="text-lg font-semibold text-[#4edea3] mt-1 tracking-tight">
              {telemetry.average > 0
                ? telemetry.average.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : telemetry.peak || data.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#131316] p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase block tracking-wider">
              Highest Value
            </span>
            <p className="text-lg font-semibold text-amber-300 mt-1 tracking-tight">
              {telemetry.peak > 0
                ? telemetry.peak.toLocaleString()
                : "Data Uniform"}
            </p>
          </div>
        </div>

        {/* Variable Structural Alerts */}
        {telemetry.anomaliesFound > 0 ? (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-amber-400 font-bold uppercase block tracking-wide">
                Unusual Data Pattern Detected
              </span>
              <p className="text-slate-400 mt-0.5">
                Found {telemetry.anomaliesFound} values outside the expected
                statistical range for this dataset.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-3.5 flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-slate-400 font-semibold block">
                Normal Distribution Detected
              </span>
              <p className="text-slate-500 mt-0.5">
                The dataset appears evenly distributed with no major anomalies
                detected.
              </p>
            </div>
          </div>
        )}
      </div>

{/* Structural Scorecard Layout */}
<div className="bg-[#101012] rounded-2xl border border-white/[0.06] p-5 text-sm space-y-5">
  <div>
    <span className="block mb-2 text-[11px] font-medium tracking-wide text-slate-500">
      Data Quality
    </span>

    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
      <span>Completeness</span>
      <span>{telemetry.quality}%</span>
    </div>

    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1b1b1e]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
        style={{ width: `${telemetry.quality}%` }}
      />
    </div>
  </div>

  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs">
    <div className="flex items-center justify-between">
      <span className="text-slate-500">Rows Returned</span>
      <span className="font-medium text-slate-100">
        {data.length.toLocaleString()}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-slate-500">Columns</span>
      <span className="font-medium text-slate-100">
        {telemetry.keys.length}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-slate-500">Missing Values</span>
      <span className="font-medium text-slate-100">
        {telemetry.nulls}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-slate-500">Anomalies</span>
      <span
        className={`font-medium ${
          telemetry.anomaliesFound > 0
            ? "text-amber-300"
            : "text-emerald-300"
        }`}
      >
        {telemetry.anomaliesFound}
      </span>
    </div>
  </div>
</div>
    </div>
  );
};
