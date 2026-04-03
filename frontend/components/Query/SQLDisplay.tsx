'use client';

import { FileCode, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SQLDisplayProps {
  sql: string;
}

// SQL syntax highlighting
const highlightSQL = (sql: string): React.ReactNode[] => {
  if (!sql) return [];
  
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY',
    'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE',
    'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'DESC', 'ASC',
    'DISTINCT', 'UNION', 'EXCEPT', 'INTERSECT', 'CASE', 'WHEN', 'THEN',
    'ELSE', 'END', 'BETWEEN', 'LIKE', 'EXISTS', 'ALL', 'ANY', 'INTERVAL'
  ];
  
  const functions = [
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DATE_SUB', 'CURDATE', 'NOW',
    'DATE_ADD', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'COALESCE', 'CONCAT',
    'SUBSTRING', 'TRIM', 'UPPER', 'LOWER', 'CAST', 'CONVERT', 'IFNULL'
  ];

  const lines = sql.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Tokenize by preserving whitespace and splitting on word boundaries
    const tokens = line.split(/(\s+|,|\(|\)|\.)/g);
    
    const highlightedTokens = tokens.map((token, tokenIndex) => {
      const upperToken = token.toUpperCase();
      
      if (keywords.includes(upperToken)) {
        return <span key={tokenIndex} className="sql-keyword">{token}</span>;
      }
      
      if (functions.includes(upperToken)) {
        return <span key={tokenIndex} className="sql-function">{token}</span>;
      }
      
      // String literals
      if (/^'.*'$/.test(token) || /^".*"$/.test(token)) {
        return <span key={tokenIndex} className="sql-string">{token}</span>;
      }
      
      // Numbers
      if (/^\d+$/.test(token)) {
        return <span key={tokenIndex} className="sql-number">{token}</span>;
      }
      
      return token;
    });
    
    return (
      <div key={lineIndex} className="flex">
        <span className="line-number">{String(lineIndex + 1).padStart(2, '0')}</span>
        <span className="flex-1">{highlightedTokens}</span>
      </div>
    );
  });
};

export const SQLDisplay = ({ sql }: SQLDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Generated SQL</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={!sql}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* SQL Code Display */}
      <div className="flex-1 code-display rounded-lg p-4 overflow-auto border border-border">
        {sql ? (
          <pre className="text-sm leading-relaxed">
            <code>{highlightSQL(sql)}</code>
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Your SQL query will appear here...
          </div>
        )}
      </div>
    </div>
  );
};
