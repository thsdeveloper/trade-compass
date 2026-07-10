'use client';

import { CategoryBucketCard } from '@/components/molecules/CategoryBucketCard';
import type { BudgetSummary, FinanceCategory, ExpensesByCategory } from '@/types/finance';

interface PlanejamentoCategoryBreakdownProps {
  budgetSummary: BudgetSummary;
  categories: FinanceCategory[];
  expensesByCategory: ExpensesByCategory[];
  selectedMonth?: string;
}

export function PlanejamentoCategoryBreakdown({
  budgetSummary,
  categories,
  expensesByCategory,
  selectedMonth
}: PlanejamentoCategoryBreakdownProps) {
  const sortedAllocations = [...budgetSummary.allocations].sort((a, b) => {
    const order = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];
    return order.indexOf(a.category) - order.indexOf(b.category);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-900">
        Detalhamento por Categoria
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {sortedAllocations.map((allocation) => (
          <CategoryBucketCard
            key={allocation.category}
            allocation={allocation}
            totalIncome={budgetSummary.total_income}
            categories={categories}
            expensesByCategory={expensesByCategory}
            selectedMonth={selectedMonth}
          />
        ))}
      </div>
    </div>
  );
}
