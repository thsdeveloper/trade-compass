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
  LabelList,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
} from '@/types/finance';

interface IdealVsActualBarChartProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  className?: string;
}

export function IdealVsActualBarChart({
  allocations,
  totalIncome,
  className,
}: IdealVsActualBarChartProps) {
  const chartData = useMemo(() => {
    return allocations.map((allocation) => {
      const idealAmount = (totalIncome * allocation.ideal_percentage) / 100;
      const difference = allocation.actual_amount - idealAmount;
      const differencePercentage = idealAmount > 0
        ? ((difference / idealAmount) * 100)
        : 0;

      return {
        name: BUDGET_CATEGORY_LABELS[allocation.category],
        category: allocation.category,
        color: BUDGET_CATEGORY_COLORS[allocation.category],
        idealAmount,
        actualAmount: allocation.actual_amount,
        paidAmount: allocation.paid_amount,
        pendingAmount: allocation.pending_amount,
        difference,
        differencePercentage,
        status: allocation.status,
      };
    });
  }, [allocations, totalIncome]);

  const maxValue = useMemo(() => {
    const max = Math.max(
      ...chartData.map((d) => Math.max(d.idealAmount, d.actualAmount))
    );
    return max * 1.15; // Add 15% padding
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.difference > 0;

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <p className="text-sm font-medium text-slate-900">{data.name}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs text-slate-500">Ideal:</span>
              <span className="text-xs font-medium text-slate-600 tabular-nums">
                {formatCurrency(data.idealAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs text-slate-500">Real:</span>
              <span className="text-xs font-semibold text-slate-900 tabular-nums">
                {formatCurrency(data.actualAmount)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-slate-500">Pago:</span>
                <span className="text-xs font-medium text-emerald-600 tabular-nums">
                  {formatCurrency(data.paidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-slate-500">Pendente:</span>
                <span className="text-xs font-medium text-amber-600 tabular-nums">
                  {formatCurrency(data.pendingAmount)}
                </span>
              </div>
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
                  {isOver ? '+' : ''}{formatCurrency(data.difference)}
                  {' '}({isOver ? '+' : ''}{data.differencePercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label for difference
  const DifferenceLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number;
    index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0 } = props;
    const data = chartData[index];
    if (!data) return null;

    const isOver = data.difference > 0;
    const labelX = x + width + 8;
    const labelY = y + 12;

    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          className={cn(
            'text-[10px] font-medium',
            isOver ? 'fill-red-500' : 'fill-emerald-500'
          )}
        >
          {isOver ? '+' : ''}{data.differencePercentage.toFixed(0)}%
        </text>
      </g>
    );
  };

  if (totalIncome === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-sm text-slate-400">
          Sem receitas para comparar
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="mb-1 text-sm font-medium text-slate-700">
        Ideal vs Real
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Comparativo de gastos por categoria
      </p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
            barGap={2}
          >
            <XAxis
              type="number"
              domain={[0, maxValue]}
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Ideal amount - outline bar */}
            <Bar
              dataKey="idealAmount"
              fill="transparent"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 2"
              radius={[0, 4, 4, 0]}
              barSize={24}
            />

            {/* Paid amount - solid bar */}
            <Bar
              dataKey="paidAmount"
              radius={[0, 0, 0, 0]}
              barSize={24}
              stackId="actual"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-paid-${index}`}
                  fill={entry.color}
                />
              ))}
            </Bar>

            {/* Pending amount - lighter bar */}
            <Bar
              dataKey="pendingAmount"
              radius={[0, 4, 4, 0]}
              barSize={24}
              stackId="actual"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-pending-${index}`}
                  fill={entry.color}
                  fillOpacity={0.4}
                />
              ))}
              <LabelList content={<DifferenceLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-dashed border-slate-400 bg-transparent" />
          <span className="text-slate-600">Ideal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-slate-500" />
          <span className="text-slate-600">Pago</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-slate-300" />
          <span className="text-slate-600">Pendente</span>
        </div>
      </div>
    </div>
  );
}
