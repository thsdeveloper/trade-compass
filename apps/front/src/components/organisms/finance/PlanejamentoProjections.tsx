'use client';

import { useMemo } from 'react';
import { ProjectionCard } from '@/components/molecules/ProjectionCard';
import type { BudgetSummary, PlanningProjection, BudgetCategory, PlanningStatus, PlanningTrend } from '@/types/finance';
import { BUDGET_CATEGORY_IDEAL } from '@/types/finance';

interface PlanejamentoProjectionsProps {
  budgetSummary: BudgetSummary;
  daysRemaining: number;
  daysElapsed: number;
}

function calculateProjections(
  budgetSummary: BudgetSummary,
  daysRemaining: number,
  daysElapsed: number
): PlanningProjection[] {
  const totalDays = daysElapsed + daysRemaining;

  return budgetSummary.allocations.map((allocation) => {
    const idealPercentage = BUDGET_CATEGORY_IDEAL[allocation.category];
    const idealAmount = (budgetSummary.total_income * idealPercentage) / 100;

    const dailyAverage = daysElapsed > 0
      ? allocation.actual_amount / daysElapsed
      : 0;

    const projectedEndOfMonth = allocation.actual_amount + (dailyAverage * daysRemaining);

    let status: PlanningStatus;
    if (projectedEndOfMonth <= idealAmount * 1.05) {
      status = 'on_track';
    } else if (projectedEndOfMonth <= idealAmount * 1.15) {
      status = 'at_risk';
    } else {
      status = 'over_budget';
    }

    let trend: PlanningTrend;
    if (dailyAverage > (idealAmount / totalDays) * 1.1) {
      trend = 'increasing';
    } else if (dailyAverage < (idealAmount / totalDays) * 0.9) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      category: allocation.category as BudgetCategory,
      current_amount: allocation.actual_amount,
      projected_end_of_month: projectedEndOfMonth,
      ideal_amount: idealAmount,
      daily_average: dailyAverage,
      days_remaining: daysRemaining,
      trend,
      status,
    };
  });
}

export function PlanejamentoProjections({
  budgetSummary,
  daysRemaining,
  daysElapsed
}: PlanejamentoProjectionsProps) {
  const projections = useMemo(
    () => calculateProjections(budgetSummary, daysRemaining, daysElapsed),
    [budgetSummary, daysRemaining, daysElapsed]
  );

  const sortedProjections = [...projections].sort((a, b) => {
    const order: BudgetCategory[] = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];
    return order.indexOf(a.category) - order.indexOf(b.category);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-900">
          Projecoes de Fim de Mes
        </h2>
        <span className="text-xs text-slate-500">
          {daysRemaining} dias restantes
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sortedProjections.map((projection) => (
          <ProjectionCard
            key={projection.category}
            projection={projection}
          />
        ))}
      </div>
    </div>
  );
}
