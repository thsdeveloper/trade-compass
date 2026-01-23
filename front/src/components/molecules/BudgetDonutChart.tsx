'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
  BUDGET_CATEGORY_IDEAL,
} from '@/types/finance';

interface BudgetDonutChartProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  className?: string;
}

export function BudgetDonutChart({
  allocations,
  totalIncome,
  className
}: BudgetDonutChartProps) {
  const chartData = useMemo(() => {
    return allocations.map((allocation) => ({
      name: BUDGET_CATEGORY_LABELS[allocation.category],
      value: allocation.actual_amount,
      percentage: allocation.actual_percentage,
      idealPercentage: BUDGET_CATEGORY_IDEAL[allocation.category],
      paidAmount: allocation.paid_amount,
      pendingAmount: allocation.pending_amount,
      category: allocation.category,
      color: BUDGET_CATEGORY_COLORS[allocation.category],
      status: allocation.status,
    }));
  }, [allocations]);

  const totalExpenses = useMemo(() => {
    return allocations.reduce((sum, a) => sum + a.actual_amount, 0);
  }, [allocations]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">Total:</span>
              <span className="text-xs font-semibold text-slate-900">
                {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">Pago:</span>
              <span className="text-xs font-medium text-emerald-600">
                {formatCurrency(data.paidAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">Pendente:</span>
              <span className="text-xs font-medium text-amber-600">
                {formatCurrency(data.pendingAmount)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">Meta:</span>
                <span className="text-xs text-slate-600">
                  {data.idealPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (totalIncome === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-sm text-slate-400">
          Sem receitas para calcular alocacao
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-sm font-medium text-slate-700">
        Distribuicao Atual
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full md:w-1/2 space-y-3">
          {chartData.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {item.percentage.toFixed(1)}%
                </span>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    item.percentage > item.idealPercentage
                      ? 'text-red-500'
                      : item.percentage < item.idealPercentage * 0.7
                        ? 'text-amber-500'
                        : 'text-slate-400'
                  )}
                >
                  ({item.idealPercentage}%)
                </span>
              </div>
            </div>
          ))}

          {/* Ideal vs Actual comparison */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Ideal</span>
              <span>Atual</span>
            </div>
            <div className="flex gap-2">
              {/* Ideal distribution */}
              <div className="flex-1 flex h-2 rounded-full overflow-hidden">
                <div className="w-1/2" style={{ backgroundColor: BUDGET_CATEGORY_COLORS.ESSENCIAL }} />
                <div className="w-[30%]" style={{ backgroundColor: BUDGET_CATEGORY_COLORS.ESTILO_VIDA }} />
                <div className="w-1/5" style={{ backgroundColor: BUDGET_CATEGORY_COLORS.INVESTIMENTO }} />
              </div>
              {/* Actual distribution */}
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-100">
                {chartData.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
