'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
  BUDGET_CATEGORY_IDEAL,
} from '@/types/finance';

interface BudgetRadarChartProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  className?: string;
}

export function BudgetRadarChart({
  allocations,
  totalIncome,
  className,
}: BudgetRadarChartProps) {
  const chartData = useMemo(() => {
    return allocations.map((allocation) => {
      const idealAmount = (totalIncome * allocation.ideal_percentage) / 100;

      return {
        subject: BUDGET_CATEGORY_LABELS[allocation.category],
        category: allocation.category,
        ideal: allocation.ideal_percentage,
        actual: allocation.actual_percentage,
        idealAmount,
        actualAmount: allocation.actual_amount,
        paidAmount: allocation.paid_amount,
        pendingAmount: allocation.pending_amount,
        status: allocation.status,
        color: BUDGET_CATEGORY_COLORS[allocation.category],
      };
    });
  }, [allocations, totalIncome]);

  // Find max percentage for domain
  const maxPercentage = useMemo(() => {
    const max = Math.max(
      ...chartData.map((d) => Math.max(d.ideal, d.actual)),
      100
    );
    return Math.ceil(max / 10) * 10; // Round up to nearest 10
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const diff = data.actual - data.ideal;
      const isOver = diff > 0;

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <p className="text-sm font-medium text-slate-900">{data.subject}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs text-slate-500">Ideal:</span>
              <span className="text-xs font-medium text-slate-600 tabular-nums">
                {data.ideal}% ({formatCurrency(data.idealAmount)})
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs text-slate-500">Atual:</span>
              <span className="text-xs font-semibold text-slate-900 tabular-nums">
                {data.actual.toFixed(1)}% ({formatCurrency(data.actualAmount)})
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-slate-500">Diferenca:</span>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    isOver ? 'text-red-600' : 'text-emerald-600'
                  )}
                >
                  {isOver ? '+' : ''}{diff.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tick for angle axis
  const CustomAngleTick = (props: {
    payload?: { value: string };
    x?: number;
    y?: number;
    cx?: number;
    cy?: number;
    index?: number;
  }) => {
    const { payload, x = 0, y = 0, cx = 0, cy = 0, index = 0 } = props;
    if (!payload) return null;

    const data = chartData[index];
    if (!data) return null;

    // Adjust position based on angle
    const angle = (index * 360) / chartData.length - 90;
    const dx = x > cx ? 10 : x < cx ? -10 : 0;
    const dy = y > cy ? 10 : y < cy ? -10 : 0;

    return (
      <g transform={`translate(${x + dx}, ${y + dy})`}>
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs font-medium fill-slate-700"
        >
          {payload.value}
        </text>
        <text
          y={14}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[10px] fill-slate-400"
        >
          ({data.ideal}%)
        </text>
      </g>
    );
  };

  if (totalIncome === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-sm text-slate-400">
          Sem receitas para exibir distribuicao
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="mb-1 text-sm font-medium text-slate-700">
        Distribuicao Orcamentaria
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Comparacao entre ideal (50-30-20) e real
      </p>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="subject"
              tick={<CustomAngleTick />}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxPercentage]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickCount={5}
              axisLine={false}
            />

            {/* Ideal distribution - transparent fill with dashed stroke */}
            <Radar
              name="Ideal"
              dataKey="ideal"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="#94a3b8"
              fillOpacity={0.1}
            />

            {/* Actual distribution - solid fill */}
            <Radar
              name="Atual"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.3}
            />

            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
          <span className="text-slate-600">Ideal (50-30-20)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500/30 border border-blue-500" />
          <span className="text-slate-600">Atual</span>
        </div>
      </div>

      {/* Status summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {chartData.map((item) => {
          const diff = item.actual - item.ideal;
          const isOver = diff > 0;
          const isClose = Math.abs(diff) <= 5;

          return (
            <div
              key={item.category}
              className={cn(
                'rounded-md px-2 py-1.5 text-center',
                isClose
                  ? 'bg-emerald-50'
                  : isOver
                    ? 'bg-red-50'
                    : 'bg-blue-50'
              )}
            >
              <div
                className="text-xs font-medium"
                style={{ color: item.color }}
              >
                {item.subject}
              </div>
              <div
                className={cn(
                  'text-sm font-bold tabular-nums',
                  isClose
                    ? 'text-emerald-600'
                    : isOver
                      ? 'text-red-600'
                      : 'text-blue-600'
                )}
              >
                {item.actual.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
