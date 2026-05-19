"use client";

import { Sparkles } from "lucide-react";
import { StatsCards } from "./StatsCards";

interface InsightsPanelProps {
  data: Record<string, unknown>[];
  explanation?: string;
  insights?: unknown;
}

interface InsightsData {
  summary?: string;
  key_patterns?: string[];
  anomalies?: string[];
  recommendations?: string[];
}

const isInsightsData = (obj: unknown): obj is InsightsData => {
  return typeof obj === "object" && obj !== null;
};

export const InsightsPanel = ({
  data,
  explanation,
  insights,
}: InsightsPanelProps) => {
  const insightsData = isInsightsData(insights)
    ? (insights as InsightsData)
    : {};
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Run a query to see insights
      </div>
    );
  }

  const totalCells = data.length * Object.keys(data[0]).length;

  const nullCells = data.reduce((count, row) => {
    return (
      count +
      Object.values(row).filter(
        (v) => v === null || v === undefined || v === "",
      ).length
    );
  }, 0);

  const dataQuality = Math.round(((totalCells - nullCells) / totalCells) * 100);

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* AI Summary */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">AI Insights</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          {insightsData.summary || explanation}
        </p>
      </div>

      {/* Key Patterns */}
      {(insightsData.key_patterns?.length ?? 0) > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-medium text-foreground mb-2">Key Patterns</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {insightsData.key_patterns!.map((p: string, i: number) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Anomalies */}
      {(insightsData.anomalies?.length ?? 0) > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-medium text-foreground mb-2">Anomalies</h3>
          <ul className="text-sm text-red-400 list-disc pl-5 space-y-1">
            {insightsData.anomalies!.map((a: string, i: number) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {(insightsData.recommendations?.length ?? 0) > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-medium text-foreground mb-2">Recommendations</h3>
          <ul className="text-sm text-green-400 list-disc pl-5 space-y-1">
            {insightsData.recommendations!.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards data={data} />

      {/* Key Metrics */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="font-medium text-foreground mb-4">Key Metrics</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Data Quality</span>
            <span className="text-foreground">{dataQuality}%</span>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${dataQuality}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Total Rows</span>
          <span className="text-foreground">{data.length}</span>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Columns</span>
          <span className="text-foreground">{Object.keys(data[0]).length}</span>
        </div>
      </div>
    </div>
  );
};
