'use client';

import { BudgetMethodologyHero } from '@/components/molecules/BudgetMethodologyHero';
import { BudgetHealthScore } from '@/components/molecules/BudgetHealthScore';
import { BudgetRadarChart } from '@/components/molecules/BudgetRadarChart';
import type { BudgetSummary } from '@/types/finance';

interface PlanejamentoOverviewProps {
  budgetSummary: BudgetSummary;
}

export function PlanejamentoOverview({ budgetSummary }: PlanejamentoOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Hero + Health Score */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BudgetMethodologyHero
            allocations={budgetSummary.allocations}
            totalIncome={budgetSummary.total_income}
          />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Saude Financeira
          </h3>
          <BudgetHealthScore
            allocations={budgetSummary.allocations}
            size="md"
          />
        </div>
      </div>

      {/* Radar Chart - Ideal vs Real Distribution */}
      <BudgetRadarChart
        allocations={budgetSummary.allocations}
        totalIncome={budgetSummary.total_income}
      />
    </div>
  );
}
