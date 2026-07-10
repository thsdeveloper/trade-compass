'use client';

import { formatCurrency } from '@/types/finance';
import type { YearSummary } from '@/types/finance';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

interface YearDashboardProps {
  yearSummary: YearSummary;
  onMonthClick: (month: string) => void;
}

export function YearDashboard({ yearSummary, onMonthClick }: YearDashboardProps) {
  const maxValue = Math.max(
    ...yearSummary.monthly_breakdown.flatMap(m => [m.income, m.expenses]),
    1 // Prevent division by zero
  );

  return (
    <div className="space-y-8">
      {/* Year Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Saldo Total"
          value={yearSummary.total_balance}
          subtitle="Saldo atual das contas"
          icon={Wallet}
          variant="default"
        />

        <SummaryCard
          title="Total Despesas"
          value={yearSummary.total_expenses}
          subtitle={`Em ${yearSummary.year}`}
          icon={ArrowDownRight}
          variant="danger"
        />

        <SummaryCard
          title="Total Receitas"
          value={yearSummary.total_income}
          subtitle={`Em ${yearSummary.year}`}
          icon={ArrowUpRight}
          variant="success"
        />

        <SummaryCard
          title="Resultado Anual"
          value={yearSummary.year_result}
          subtitle="Receitas - Despesas"
          icon={TrendingUp}
          variant={yearSummary.year_result >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Monthly Breakdown Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-6">
          Evolucao Mensal
        </h3>

        <div className="space-y-3">
          {yearSummary.monthly_breakdown.map((month, index) => {
            const incomePercent = maxValue > 0
              ? (month.income / maxValue) * 100
              : 0;
            const expensePercent = maxValue > 0
              ? (month.expenses / maxValue) * 100
              : 0;

            return (
              <button
                key={month.month}
                onClick={() => onMonthClick(month.month)}
                className="w-full text-left group"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-xs font-medium text-slate-500">
                    {MONTH_LABELS[index]}
                  </span>

                  <div className="flex-1 space-y-1">
                    {/* Income bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all group-hover:bg-emerald-600"
                          style={{ width: `${incomePercent}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-xs tabular-nums text-emerald-600">
                        {formatCurrency(month.income)}
                      </span>
                    </div>

                    {/* Expense bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all group-hover:bg-red-600"
                          style={{ width: `${expensePercent}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-xs tabular-nums text-red-600">
                        {formatCurrency(month.expenses)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'w-24 text-right text-xs font-medium tabular-nums',
                      month.result >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(month.result)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded-full bg-emerald-500" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded-full bg-red-500" />
            <span>Despesas</span>
          </div>
        </div>
      </div>

      {/* Year Totals */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">
          Resumo do Ano
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Total Receitas
            </span>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
              {formatCurrency(yearSummary.total_income)}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-red-600">
              Total Despesas
            </span>
            <p className="mt-1 text-xl font-bold tabular-nums text-red-700">
              {formatCurrency(yearSummary.total_expenses)}
            </p>
          </div>
          <div className={cn(
            'rounded-lg p-4',
            yearSummary.year_result >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          )}>
            <span className={cn(
              'text-xs font-medium uppercase tracking-wider',
              yearSummary.year_result >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              Resultado
            </span>
            <p className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              yearSummary.year_result >= 0 ? 'text-emerald-700' : 'text-red-700'
            )}>
              {formatCurrency(yearSummary.year_result)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
