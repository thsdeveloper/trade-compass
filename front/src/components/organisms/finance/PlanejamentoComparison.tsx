'use client';

import { IdealVsActualBarChart } from '@/components/molecules/IdealVsActualBarChart';
import { IncomeWaterfallChart } from '@/components/molecules/IncomeWaterfallChart';
import type { BudgetSummary } from '@/types/finance';
import { cn } from '@/lib/utils';

interface PlanejamentoComparisonProps {
  budgetSummary: BudgetSummary;
  className?: string;
}

export function PlanejamentoComparison({
  budgetSummary,
  className,
}: PlanejamentoComparisonProps) {
  return (
    <section className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Ideal vs Real
        </h2>
        <p className="text-sm text-slate-500">
          Comparativo detalhado entre orcamento planejado e gastos realizados
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IdealVsActualBarChart
          allocations={budgetSummary.allocations}
          totalIncome={budgetSummary.total_income}
        />
        <IncomeWaterfallChart
          allocations={budgetSummary.allocations}
          totalIncome={budgetSummary.total_income}
        />
      </div>
    </section>
  );
}
