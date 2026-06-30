'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  X,
  Download,
  Clock,
  Rows3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface ResultsTableProps {
  data: Record<string, unknown>[];
  executionTime?: number;
  className?: string;
}

const PAGE_SIZE = 50;

function TableGrid({
  data,
  columns,
  page,
}: {
  data: Record<string, unknown>[];
  columns: string[];
  page: number;
}) {
  const start = page * PAGE_SIZE;
  const rows = data.slice(start, start + PAGE_SIZE);

  return (
    <div className="overflow-auto w-full h-full custom-scrollbar">
      <table className="w-full min-w-max border-collapse text-[12px]">
        <thead className="sticky top-0 z-10">
          <tr
            className="text-left select-none"
            style={{ background: 'var(--ds-base-2)', borderBottom: '1px solid var(--ds-border-subtle)' }}
          >
            <th className="px-3 py-2.5 text-[11px] font-semibold text-content-3 w-10 text-right">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-[11px] font-semibold text-content-3 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="transition-colors duration-[60ms] hover:bg-base-1 border-b border-[var(--ds-border-subtle)]"
            >
              <td className="px-3 py-2 text-[11px] font-mono text-content-3 text-right tabular-nums w-10">
                {start + ri + 1}
              </td>
              {columns.map((col) => {
                const val = row[col];
                const isNull = val === null || val === undefined;
                const isNum = typeof val === 'number';
                return (
                  <td
                    key={col}
                    className={[
                      'px-3 py-2 font-mono whitespace-nowrap max-w-[260px] truncate',
                      isNull
                        ? 'text-content-3 italic'
                        : isNum
                          ? 'text-[var(--ds-accent)] tabular-nums'
                          : 'text-content-1',
                    ].join(' ')}
                    title={isNull ? 'NULL' : String(val)}
                  >
                    {isNull ? 'NULL' : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsTable({ data, executionTime, className = '' }: ResultsTableProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [page, setPage] = useState(0);
  const [mainEl, setMainEl] = useState<Element | null>(null);

  useEffect(() => { setMainEl(document.querySelector('main')); }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const downloadCSV = useCallback(() => {
    if (!data.length) return;
    const header = columns.join(',');
    const rows = data.map((r) =>
      columns
        .map((c) => {
          const v = r[c];
          if (v === null || v === undefined) return '';
          const s = String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intelliquery_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [data, columns]);

  const TableContent = (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 py-2.5 border-b border-border"
        style={{ background: 'var(--ds-base-1)' }}
      >
        <div className="flex items-center gap-4 text-[12px] text-content-3">
          <span className="flex items-center gap-1.5">
            <Rows3 className="h-3.5 w-3.5" />
            <strong className="text-content-1 font-semibold">{data.length.toLocaleString()}</strong> rows
          </span>
          <span className="flex items-center gap-1.5">
            <strong className="text-content-1 font-semibold">{columns.length}</strong> columns
          </span>
          {executionTime !== undefined && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <strong className="text-content-1 font-semibold">{executionTime}</strong>ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCSV}
            className="h-7 gap-1.5 px-2.5 text-[11px]"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(true)}
            className="h-7 gap-1.5 px-2.5 text-[11px]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TableGrid data={data} columns={columns} page={page} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex flex-shrink-0 items-center justify-between px-4 py-2 border-t border-border text-[12px] text-content-3"
          style={{ background: 'var(--ds-base-1)' }}
        >
          <span>
            Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of {data.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium text-content-1">{page + 1} / {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
          className={[
            'rounded-xl border border-border overflow-hidden bg-base-0',
            className,
          ].join(' ')}
          style={{ boxShadow: 'var(--ds-shadow-sm)', height: 320 }}
        >
          {TableContent}
        </motion.div>
      </AnimatePresence>

      {/* Fullscreen — portal into <main> so sidebar stays visible */}
      {fullscreen && mainEl && createPortal(
        <div
          className="absolute inset-0 z-50 flex flex-col"
          style={{ background: 'var(--ds-base-0)' }}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-border"
            style={{ background: 'var(--ds-base-1)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-semibold text-content-1">Query Results</span>
              <span className="text-[12px] text-content-3">
                <strong className="text-content-1 font-semibold">{data.length.toLocaleString()}</strong> rows ·{' '}
                <strong className="text-content-1 font-semibold">{columns.length}</strong> columns
                {executionTime != null && <> · <strong className="text-content-1 font-semibold">{executionTime}</strong>ms</>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 gap-1.5 px-3 text-[12px]">
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </Button>
              <button
                onClick={() => setFullscreen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-content-3 hover:bg-base-3 hover:text-content-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Table — fills remaining height, scrolls both axes */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TableGrid data={data} columns={columns} page={page} />
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-border text-[12px] text-content-3"
              style={{ background: 'var(--ds-base-1)' }}
            >
              <span>
                Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of {data.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 font-medium text-content-1">{page + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>,
        mainEl
      )}
    </>
  );
}
