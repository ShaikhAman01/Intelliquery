'use client';

interface ResultsPanelProps {
  data: Record<string, unknown>[];
}

export const ResultsPanel = ({ data }: ResultsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No results to display
      </div>
    );
  }

  const keys = Object.keys(data[0]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="results-table w-full">
          <thead className="sticky top-0">
            <tr>
              {keys.map((key) => (
                <th key={key} className="px-4 py-3 text-left">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="transition-colors duration-150">
                {keys.map((key) => (
                  <td key={key} className="px-4 py-3 text-sm text-foreground">
                    {typeof row[key] === 'number' 
                      ? row[key].toLocaleString() 
                      : String(row[key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {data.length} rows returned
      </p>
    </div>
  );
};
