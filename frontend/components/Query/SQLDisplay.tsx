'use client';

import { Terminal, Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface SQLDisplayProps {
  sql: string;
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'UNION', 'ALL',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
  'WITH', 'RETURNING', 'OVER', 'PARTITION', 'ROWS', 'BETWEEN', 'EXISTS', 'ANY', 'SOME',
]);

const highlightSQL = (sql: string): React.ReactNode[] => {
  if (!sql) return [];

  return sql.split('\n').map((line, lineIndex) => {
    const tokens = line.split(/(\s+|,|\(|\)|\.)/g);

    const highlighted = tokens.map((token, tokenIndex) => {
      if (SQL_KEYWORDS.has(token.toUpperCase())) {
        return <span key={tokenIndex} className="sql-keyword">{token}</span>;
      }
      if (/^'[^']*'$/.test(token)) {
        return <span key={tokenIndex} className="sql-string">{token}</span>;
      }
      if (/^"[^"]*"$/.test(token)) {
        return <span key={tokenIndex} className="sql-identifier">{token}</span>;
      }
      if (/^\d+(\.\d+)?$/.test(token)) {
        return <span key={tokenIndex} className="sql-number">{token}</span>;
      }
      return token;
    });

    const isFirst = lineIndex === 0;
    return (
      <div
        key={lineIndex}
        className={[
          'flex w-full items-center',
          isFirst ? 'border-l-2 border-brand bg-brand-subtle pl-3.5' : 'pl-[18px]',
        ].join(' ')}
      >
        <span className="line-number text-[11px]">{lineIndex + 1}</span>
        <span className="flex-1 font-mono text-[12px] leading-7 tracking-normal whitespace-pre text-content-code">
          {highlighted}
        </span>
      </div>
    );
  });
};

export const SQLDisplay = ({ sql }: SQLDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const computationCost = useMemo(() => {
    if (!sql) return "0.000";
    const baseLength = sql.replace(/\s+/g, "").length;
    const structureWeight = (sql.match(/(JOIN|GROUP BY|ORDER BY|WHERE)/gi) || []).length;
    return ((baseLength * 0.0001) + (structureWeight * 0.002)).toFixed(3);
  }, [sql]);

  const handleCopy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-base-2 px-4 py-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-content-3 tracking-wide">
          <Terminal className="h-3.5 w-3.5" />
          <span>Generated SQL</span>
        </div>
        <div className="flex items-center gap-3">
          {sql && (
            <span className="font-mono text-[10px] text-content-3">
              Est. cost: ~{computationCost} units
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!sql}
            className="h-6 gap-1.5 px-2 text-[11px]"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-success" />
              : <Copy className="h-3.5 w-3.5" />
            }
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

      {/* Code area */}
      <div className="custom-scrollbar flex-1 overflow-auto py-3">
        {sql ? (
          <pre className="min-w-max">
            <code>{highlightSQL(sql)}</code>
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center text-content-3 font-mono text-[12px]">
            -- Run a query to see the generated SQL
          </div>
        )}
      </div>
    </div>
  );
};
