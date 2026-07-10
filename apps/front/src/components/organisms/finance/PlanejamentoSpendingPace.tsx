'use client';

import { SpendingPaceGauge } from '@/components/molecules/SpendingPaceGauge';
import { MonthlyPaceTimeline } from '@/components/molecules/MonthlyPaceTimeline';
import type { BudgetSummary } from '@/types/finance';
import { cn } from '@/lib/utils';

interface PlanejamentoSpendingPaceProps {
  budgetSummary: BudgetSummary;
  daysElapsed: number;
  daysRemaining: number;
  className?: string;
}

export function PlanejamentoSpendingPace({
  budgetSummary,
  daysElapsed,
  daysRemaining,
  className,
}: PlanejamentoSpendingPaceProps) {
  const daysInMonth = daysElapsed + daysRemaining;

  return (
    <section className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Ritmo de Gastos
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe a velocidade dos seus gastos em relacao ao ideal
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Dia</span>
            <span className="font-semibold text-blue-600">{daysElapsed}</span>
          </div>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">{daysInMonth}</span>
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-slate-700">
          Velocimetro por Categoria
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {budgetSummary.allocations.map((allocation) => (
            <div
              key={allocation.category}
              className="flex justify-center rounded-lg bg-slate-50 p-4"
            >
              <SpendingPaceGauge
                allocation={allocation}
                totalIncome={budgetSummary.total_income}
                daysElapsed={daysElapsed}
                daysInMonth={daysInMonth}
              />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600">0-80%: No ritmo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-600">80-100%: Atencao</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-slate-600">100%+: Acima do ideal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Timeline */}
      <MonthlyPaceTimeline
        allocations={budgetSummary.allocations}
        totalIncome={budgetSummary.total_income}
        daysElapsed={daysElapsed}
        daysInMonth={daysInMonth}
      />
    </section>
  );
}
