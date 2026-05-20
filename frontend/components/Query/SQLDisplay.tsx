'use client';

import { Terminal, Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface SQLDisplayProps {
  sql: string;
}

const highlightSQL = (sql: string): React.ReactNode[] => {
  if (!sql) return [];
  
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY',
    'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];

  return sql.split('\n').map((line, lineIndex) => {
    const tokens = line.split(/(\s+|,|\(|\)|\.)/g);
    const highlightedTokens = tokens.map((token, tokenIndex) => {
      const isKeyword = keywords.includes(token.toUpperCase());
      if (isKeyword) {
        return <span key={tokenIndex} className="text-[#d0bcff] font-semibold">{token}</span>;
      }
      if (/^'.*'$/.test(token) || /^".*"$/.test(token)) {
        return <span key={tokenIndex} className="text-[#4edea3] font-mono">{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={tokenIndex} className="text-[#fbbf24] font-mono">{token}</span>;
      }
      return token;
    });
    
    return (
      <div key={lineIndex} className={`flex w-full items-center px-4 ${lineIndex === 0 ? 'border-l-2 border-[#8b5cf6]/70 bg-[#8b5cf6]/[0.03]' : 'pl-[18px]'}`}>
        <span className="w-6 text-right pr-3 select-none font-mono text-[11px] text-slate-600">{lineIndex + 1}</span>
        <span className="flex-1 font-mono text-[13px] tracking-normal whitespace-pre">{highlightedTokens}</span>
      </div>
    );
  });
};

export const SQLDisplay = ({ sql }: SQLDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const computationCost = useMemo(() => {
    if (!sql) return "0.00";
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
<div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101012]">      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#131316] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-400">
          <Terminal className="h-3.5 w-3.5 text-slate-500" />
<span>Generated SQL</span>
        </div>
        <div className="flex items-center gap-4">
          {sql && <span className="font-mono text-[10px] text-slate-500">Estimated Cost: ~{computationCost} units </span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!sql}
className="h-8 gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-[11px] font-medium text-slate-300 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white"          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

     <div className="custom-scrollbar flex-1 overflow-auto py-4">
        {sql ? (
<pre className="leading-7 text-slate-300">
              <code>{highlightSQL(sql)}</code>
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs">
            -- Engine awaiting pipeline input parameters...
          </div>
        )}
      </div>
    </div>
  );
};