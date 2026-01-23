'use client';

import { Wallet, TrendingUp, PiggyBank, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/types/finance';
import type { FixedIncomeSummary } from '@/types/finance';

interface FixedIncomeSummaryCardsProps {
  summary: FixedIncomeSummary;
}

export function FixedIncomeSummaryCards({ summary }: FixedIncomeSummaryCardsProps) {
  const getYieldColor = (yield_: number) => {
    if (yield_ > 0) return 'text-emerald-600';
    if (yield_ < 0) return 'text-red-600';
    return 'text-slate-900';
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Invested */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs font-medium text-slate-400">Total Investido</p>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
          {formatCurrency(summary.total_invested)}
        </p>
      </div>

      {/* Current Value */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <PiggyBank className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-400">Valor Atual</p>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
          {formatCurrency(summary.total_current_value)}
        </p>
      </div>

      {/* Gross Yield */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            summary.total_gross_yield >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          )}>
            <TrendingUp className={cn(
              'h-4 w-4',
              summary.total_gross_yield >= 0 ? 'text-emerald-600' : 'text-red-600'
            )} />
          </div>
          <p className="text-xs font-medium text-slate-400">Rendimento Bruto</p>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className={cn('text-2xl font-semibold tabular-nums', getYieldColor(summary.total_gross_yield))}>
            {formatCurrency(summary.total_gross_yield)}
          </p>
          <span className={cn('text-sm', getYieldColor(summary.total_gross_yield))}>
            ({summary.total_yield_percentage >= 0 ? '+' : ''}{summary.total_yield_percentage.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Active Investments */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
            <Landmark className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs font-medium text-slate-400">Investimentos Ativos</p>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
          {summary.active_investments}
        </p>
      </div>
    </div>
  );
}
