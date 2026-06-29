'use client';

import { Table } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface ResultsPanelProps {
  data: Record<string, unknown>[];
}

export const ResultsPanel = ({ data }: ResultsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Table}
        title="No data yet"
        description="Run a query to see results here."
        size="sm"
        className="h-full"
      />
    );
  }

  const keys = Object.keys(data[0]);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Table */}
      <div
        className="flex-1 overflow-auto rounded-md border border-border bg-base-0 custom-scrollbar"
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
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-base-2 transition-colors duration-[100ms]"
              >
                {keys.map((key) => (
                  <td key={key} className="px-3 py-2.5 text-[12px] text-content-1 font-mono whitespace-nowrap">
                    {typeof row[key] === 'number'
                      ? (row[key] as number).toLocaleString()
                      : String(row[key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      <p className="text-[12px] text-content-3 flex-shrink-0">
        {data.length.toLocaleString()} {data.length === 1 ? "row" : "rows"} returned
      </p>
    </div>
  );
};
