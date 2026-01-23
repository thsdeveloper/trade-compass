'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Home, ShoppingBag, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import type { BudgetCategory, BudgetAllocation, ExpensesByCategory, FinanceCategory, PlanningStatus } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
  BUDGET_CATEGORY_IDEAL,
} from '@/types/finance';

interface CategoryBucketCardProps {
  allocation: BudgetAllocation;
  totalIncome: number;
  categories: FinanceCategory[];
  expensesByCategory: ExpensesByCategory[];
  className?: string;
}

const bucketIcons = {
  ESSENCIAL: Home,
  ESTILO_VIDA: ShoppingBag,
  INVESTIMENTO: PiggyBank,
};

const bucketDescriptions = {
  ESSENCIAL: 'Necessidades basicas como moradia, alimentacao e transporte',
  ESTILO_VIDA: 'Lazer, compras, streaming e outros desejos',
  INVESTIMENTO: 'Poupanca, investimentos e reserva de emergencia',
};

export function CategoryBucketCard({
  allocation,
  totalIncome,
  categories,
  expensesByCategory,
  className
}: CategoryBucketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = bucketIcons[allocation.category];
  const color = BUDGET_CATEGORY_COLORS[allocation.category];
  const idealPercentage = BUDGET_CATEGORY_IDEAL[allocation.category];
  const idealAmount = (totalIncome * idealPercentage) / 100;
  const difference = allocation.actual_amount - idealAmount;
  const progressPercentage = totalIncome > 0 ? (allocation.actual_amount / idealAmount) * 100 : 0;

  const bucketCategories = categories.filter(
    (c) => c.budget_category === allocation.category && c.type === 'DESPESA'
  );

  const categoriesWithExpenses = bucketCategories.map((category) => {
    const expense = expensesByCategory.find((e) => e.category_id === category.id);
    return {
      category,
      amount: expense?.total || 0,
      percentage: expense?.percentage || 0,
    };
  }).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div
      className={cn(
        'rounded-lg border bg-white transition-all',
        isExpanded ? 'shadow-sm' : '',
        className
      )}
      style={{ borderColor: `${color}40` }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                {BUDGET_CATEGORY_LABELS[allocation.category]}
              </h3>
              <p className="text-xs text-slate-500">
                Meta: {idealPercentage}% ({formatCurrency(idealAmount)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={allocation.status as PlanningStatus} showIcon={false} />
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-lg font-bold tabular-nums" style={{ color }}>
              {formatCurrency(allocation.actual_amount)}
            </span>
            <span className="text-sm tabular-nums text-slate-600">
              {allocation.actual_percentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            {/* Ideal marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-400 z-10"
              style={{ left: '100%', transform: 'translateX(-50%)' }}
            />
            {/* Actual progress */}
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressPercentage, 100)}%`,
                backgroundColor: progressPercentage > 100 ? '#ef4444' : color,
              }}
            />
            {/* Over budget indicator */}
            {progressPercentage > 100 && (
              <div
                className="absolute top-0 h-full rounded-r-full bg-red-200"
                style={{
                  left: '100%',
                  width: `${Math.min(progressPercentage - 100, 50)}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">
              Pago: {formatCurrency(allocation.paid_amount)}
            </span>
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                difference > 0 ? 'text-red-500' : 'text-emerald-500'
              )}
            >
              {difference > 0 ? '+' : ''}{formatCurrency(difference)}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-3">
            {bucketDescriptions[allocation.category]}
          </p>

          {categoriesWithExpenses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">
                Nenhuma despesa nesta categoria
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoriesWithExpenses.map(({ category, amount, percentage }) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      icon={category.icon}
                      color={category.color}
                      size="sm"
                    />
                    <span className="text-sm text-slate-700">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(amount)}
                    </span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pago vs Pendente breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600">
                  Pago: {formatCurrency(allocation.paid_amount)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-slate-600">
                  Pendente: {formatCurrency(allocation.pending_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
