'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
} from '@/types/finance';

interface IncomeWaterfallChartProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  className?: string;
}

interface WaterfallDataPoint {
  name: string;
  value: number;
  displayValue: number;
  start: number;
  end: number;
  color: string;
  isTotal: boolean;
  isPositive: boolean;
}

export function IncomeWaterfallChart({
  allocations,
  totalIncome,
  className,
}: IncomeWaterfallChartProps) {
  const chartData = useMemo(() => {
    const data: WaterfallDataPoint[] = [];

    // Starting point: Total Income
    data.push({
      name: 'Renda',
      value: totalIncome,
      displayValue: totalIncome,
      start: 0,
      end: totalIncome,
      color: '#22c55e',
      isTotal: true,
      isPositive: true,
    });

    // Running balance
    let runningBalance = totalIncome;

    // Add each allocation as a descending bar
    allocations.forEach((allocation) => {
      const newBalance = runningBalance - allocation.actual_amount;

      data.push({
        name: BUDGET_CATEGORY_LABELS[allocation.category],
        value: -allocation.actual_amount,
        displayValue: allocation.actual_amount,
        start: newBalance,
        end: runningBalance,
        color: BUDGET_CATEGORY_COLORS[allocation.category],
        isTotal: false,
        isPositive: false,
      });

      runningBalance = newBalance;
    });

    // Final balance
    const finalBalance = totalIncome - allocations.reduce((sum, a) => sum + a.actual_amount, 0);
    data.push({
      name: 'Saldo',
      value: finalBalance,
      displayValue: Math.abs(finalBalance),
      start: 0,
      end: finalBalance,
      color: finalBalance >= 0 ? '#22c55e' : '#ef4444',
      isTotal: true,
      isPositive: finalBalance >= 0,
    });

    return data;
  }, [allocations, totalIncome]);

  const maxValue = useMemo(() => {
    return totalIncome * 1.1;
  }, [totalIncome]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: WaterfallDataPoint }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: data.color }}
            />
            <p className="text-sm font-medium text-slate-900">{data.name}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">Valor:</span>
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  data.isPositive || data.isTotal ? 'text-emerald-600' : 'text-slate-900'
                )}
              >
                {data.isTotal
                  ? formatCurrency(data.displayValue)
                  : `-${formatCurrency(data.displayValue)}`}
              </span>
            </div>
            {!data.isTotal && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">% da Renda:</span>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  {((data.displayValue / totalIncome) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape for waterfall effect
  const WaterfallBar = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    payload?: WaterfallDataPoint;
  }) => {
    const { x = 0, width = 0, fill, payload } = props;

    if (!payload) return null;

    const barHeight = Math.abs(payload.end - payload.start);
    const scaledHeight = (barHeight / maxValue) * (180); // Approximate chart height
    const scaledStart = ((maxValue - payload.end) / maxValue) * (180);

    return (
      <g>
        {/* Connection line to previous bar */}
        {!payload.isTotal && payload.name !== 'Renda' && (
          <line
            x1={x}
            y1={scaledStart}
            x2={x}
            y2={scaledStart + scaledHeight}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        {/* Main bar */}
        <rect
          x={x}
          y={scaledStart}
          width={width}
          height={Math.max(scaledHeight, 2)}
          fill={fill}
          rx={4}
          className="transition-all duration-500"
        />

        {/* Value label */}
        <text
          x={x + width / 2}
          y={scaledStart - 5}
          textAnchor="middle"
          className="text-[10px] font-medium fill-slate-600"
        >
          {payload.isTotal
            ? formatCurrency(payload.displayValue)
            : `-${formatCurrency(payload.displayValue)}`}
        </text>
      </g>
    );
  };

  if (totalIncome === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-sm text-slate-400">
          Sem receitas para exibir fluxo
        </p>
      </div>
    );
  }

  const finalBalance = totalIncome - allocations.reduce((sum, a) => sum + a.actual_amount, 0);

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="mb-1 text-sm font-medium text-slate-700">
        Fluxo da Renda
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Como sua renda esta sendo alocada
      </p>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 30, right: 10, left: 10, bottom: 5 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[Math.min(0, finalBalance * 1.1), maxValue]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
              width={40}
            />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />

            {/* Floating bars */}
            <Bar dataKey="displayValue" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => {
                // Calculate Y position for floating bars
                const yStart = entry.start;
                const yEnd = entry.end;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={entry.isTotal ? 1 : 0.85}
                  />
                );
              })}
            </Bar>

            <Tooltip content={<CustomTooltip />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded bg-emerald-500" />
              <span className="text-xs text-slate-600">Entrada</span>
            </div>
            {allocations.map((allocation) => (
              <div key={allocation.category} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded"
                  style={{ backgroundColor: BUDGET_CATEGORY_COLORS[allocation.category] }}
                />
                <span className="text-xs text-slate-600">
                  {BUDGET_CATEGORY_LABELS[allocation.category]}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Saldo:</span>
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {formatCurrency(finalBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
