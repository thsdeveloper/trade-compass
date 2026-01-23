'use client';

import { cn } from '@/lib/utils';
import { Home, ShoppingBag, PiggyBank } from 'lucide-react';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_LABELS,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_IDEAL,
} from '@/types/finance';

interface BudgetMethodologyHeroProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  className?: string;
}

const bucketIcons = {
  ESSENCIAL: Home,
  ESTILO_VIDA: ShoppingBag,
  INVESTIMENTO: PiggyBank,
};

export function BudgetMethodologyHero({
  allocations,
  totalIncome,
  className
}: BudgetMethodologyHeroProps) {
  const sortedAllocations = [...allocations].sort((a, b) => {
    const order = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];
    return order.indexOf(a.category) - order.indexOf(b.category);
  });

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Metodologia 50-30-20
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Distribua sua renda em 3 categorias para uma vida financeira equilibrada
        </p>
      </div>

      <div className="space-y-4">
        {sortedAllocations.map((allocation) => {
          const Icon = bucketIcons[allocation.category];
          const color = BUDGET_CATEGORY_COLORS[allocation.category];
          const idealPercentage = BUDGET_CATEGORY_IDEAL[allocation.category];
          const idealAmount = (totalIncome * idealPercentage) / 100;
          const difference = allocation.actual_amount - idealAmount;
          const progressWidth = Math.min((allocation.actual_percentage / idealPercentage) * 100, 150);

          return (
            <div key={allocation.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      {BUDGET_CATEGORY_LABELS[allocation.category]}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      (ideal: {idealPercentage}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(allocation.actual_amount)}
                  </span>
                  <span className="ml-2 text-xs tabular-nums text-slate-400">
                    {allocation.actual_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                {/* Ideal marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-slate-300 z-10"
                  style={{ left: `${Math.min(idealPercentage * 2, 100)}%` }}
                />
                {/* Actual progress */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(progressWidth, 100)}%`,
                    backgroundColor: allocation.status === 'over_budget' ? '#ef4444' : color,
                  }}
                />
              </div>

              {/* Difference indicator */}
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  Ideal: {formatCurrency(idealAmount)}
                </span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    difference > 0 ? 'text-red-500' : difference < 0 ? 'text-emerald-500' : 'text-slate-500'
                  )}
                >
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total income reference */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">Renda base do mes</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {formatCurrency(totalIncome)}
        </span>
      </div>
    </div>
  );
}
