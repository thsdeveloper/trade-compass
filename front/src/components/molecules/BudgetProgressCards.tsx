'use client';

import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import { formatCurrency, BUDGET_CATEGORY_COLORS } from '@/types/finance';
import { CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';

interface BudgetProgressCardsProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
}

export function BudgetProgressCards({
  allocations,
  totalIncome,
}: BudgetProgressCardsProps) {
  const getStatusIcon = (status: BudgetAllocation['status']) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'over_budget':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'under_budget':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: BudgetAllocation['status']) => {
    switch (status) {
      case 'on_track':
        return 'No limite';
      case 'over_budget':
        return 'Acima';
      case 'under_budget':
        return 'Abaixo';
    }
  };

  const getStatusColor = (status: BudgetAllocation['status']) => {
    switch (status) {
      case 'on_track':
        return 'text-emerald-600 bg-emerald-50';
      case 'over_budget':
        return 'text-amber-600 bg-amber-50';
      case 'under_budget':
        return 'text-blue-600 bg-blue-50';
    }
  };

  if (totalIncome === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {allocations.map((allocation) => (
          <div
            key={allocation.category}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {allocation.label}
              </span>
              <span className="text-xs text-slate-400">
                {allocation.ideal_percentage}%
              </span>
            </div>
            <div className="mt-3">
              <span className="text-lg font-semibold text-slate-300">
                R$ 0,00
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {allocations.map((allocation) => {
        const idealAmount = totalIncome * (allocation.ideal_percentage / 100);
        const progressPercent = Math.min(
          (allocation.actual_amount / idealAmount) * 100,
          100
        );
        const overflowPercent = allocation.actual_amount > idealAmount
          ? ((allocation.actual_amount - idealAmount) / idealAmount) * 100
          : 0;

        return (
          <div
            key={allocation.category}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {allocation.label}
              </span>
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  getStatusColor(allocation.status)
                )}
              >
                {getStatusIcon(allocation.status)}
                {getStatusLabel(allocation.status)}
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(allocation.actual_amount)}
              </span>
              <span className="text-sm text-slate-400">
                / {formatCurrency(idealAmount)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    backgroundColor: BUDGET_CATEGORY_COLORS[allocation.category],
                  }}
                />
                {overflowPercent > 0 && (
                  <div
                    className="absolute top-0 h-full rounded-full bg-amber-400"
                    style={{
                      left: '100%',
                      width: `${Math.min(overflowPercent, 50)}%`,
                      transform: 'translateX(-100%)',
                    }}
                  />
                )}
              </div>
              <span className="text-xs tabular-nums text-slate-500">
                {allocation.actual_percentage.toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Meta: {allocation.ideal_percentage}% da renda
            </p>
          </div>
        );
      })}
    </div>
  );
}
