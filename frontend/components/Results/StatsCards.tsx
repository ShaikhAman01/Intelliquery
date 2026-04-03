'use client';

import { Users, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

interface StatsCardsProps {
  data: Record<string, unknown>[];
}

export const StatsCards = ({ data }: StatsCardsProps) => {
  // Calculate stats from data
  const totalRecords = data.length;
  
  // Try to find numeric columns for calculations
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  const numericKeys = keys.filter(key => 
    data.some(row => typeof row[key] === 'number')
  );
  
  let average = 0;
  let topValue = 0;
  
  if (numericKeys.length > 0 && data.length > 0) {
    const firstNumericKey = numericKeys[numericKeys.length - 1]; // Usually the main metric
    const values = data.map(row => Number(row[firstNumericKey]) || 0);
    average = values.reduce((a, b) => a + b, 0) / values.length;
    topValue = Math.max(...values);
  }

  const stats = [
    {
      icon: Users,
      label: 'Total Records',
      value: totalRecords.toString(),
      iconColor: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: 'Average',
      value: average.toFixed(2),
      iconColor: 'text-emerald-400',
    },
    {
      icon: DollarSign,
      label: 'Top Value',
      value: `$${topValue.toLocaleString()}`,
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="stats-card rounded-lg p-4 transition-all duration-200">
          <stat.icon className={`h-5 w-5 ${stat.iconColor} mb-2`} />
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className="text-xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
