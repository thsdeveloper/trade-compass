'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import type {
  BudgetSummary,
  FinanceCategory,
  ExpensesByCategory,
} from '@/types/finance';
import type { BudgetAnalysisReportData } from '@/types/reports';

import { PlanejamentoSkeleton } from '@/components/organisms/skeletons/PlanejamentoSkeleton';
import { PlanejamentoOverview } from '@/components/organisms/finance/PlanejamentoOverview';
import { PlanejamentoCategoryBreakdown } from '@/components/organisms/finance/PlanejamentoCategoryBreakdown';
import { PlanejamentoHistorical } from '@/components/organisms/finance/PlanejamentoHistorical';
import { PlanejamentoProjections } from '@/components/organisms/finance/PlanejamentoProjections';
import { PlanejamentoRecommendations } from '@/components/organisms/finance/PlanejamentoRecommendations';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMonthDates(monthStr: string): { daysElapsed: number; daysRemaining: number } {
  const [year, month] = monthStr.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const totalDays = getDaysInMonth(year, month);

  if (isCurrentMonth) {
    const daysElapsed = now.getDate();
    return {
      daysElapsed,
      daysRemaining: totalDays - daysElapsed,
    };
  }

  const selectedDate = new Date(year, month - 1, 1);
  if (selectedDate < now) {
    return { daysElapsed: totalDays, daysRemaining: 0 };
  }

  return { daysElapsed: 0, daysRemaining: totalDays };
}

export default function PlanejamentoPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [historicalData, setHistoricalData] = useState<BudgetAnalysisReportData | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const lastLoadedFiltersRef = useRef<string | null>(null);

  const { daysElapsed, daysRemaining } = useMemo(
    () => getMonthDates(selectedMonth),
    [selectedMonth]
  );

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    const currentMonthNum = selectedMonth.split('-')[1];
    setSelectedMonth(`${newYear}-${currentMonthNum}`);
  };

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    const filtersKey = JSON.stringify({ selectedMonth });

    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [budgetData, categoriesData, expensesData] = await Promise.all([
        financeApi.getBudgetAllocation(session.access_token, selectedMonth),
        financeApi.getCategories(session.access_token),
        financeApi.getExpensesByCategory(session.access_token, selectedMonth),
      ]);

      setBudgetSummary(budgetData);
      setCategories(categoriesData);
      setExpensesByCategory(expensesData);
      lastLoadedFiltersRef.current = filtersKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth]);

  const loadHistoricalData = useCallback(async () => {
    if (!session?.access_token) return;

    setHistoricalLoading(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const data = await financeApi.getBudgetAnalysisReport(
        session.access_token,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        true
      );

      setHistoricalData(data);
    } catch (err) {
      // Historical data is optional - don't break the page
      console.warn('Historical data not available:', err);
      setHistoricalData(null);
    } finally {
      setHistoricalLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadData();
    loadHistoricalData();
  }, [user, authLoading, router, loadData, loadHistoricalData]);

  useFinanceDataRefresh(() => {
    loadData(true);
    loadHistoricalData();
  });

  if (authLoading || loading) {
    return <PlanejamentoSkeleton />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-500">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!budgetSummary) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <p className="text-sm text-slate-500">Nenhum dado disponivel</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Month Navigation */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleYearChange(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {selectedYear}
            </span>
            <button
              onClick={() => handleYearChange(1)}
              disabled={selectedYear >= new Date().getFullYear()}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                selectedYear >= new Date().getFullYear()
                  ? "text-slate-200 cursor-not-allowed"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Tabs value={selectedMonth} onValueChange={setSelectedMonth}>
            <TabsList className="w-full grid grid-cols-12 h-9 p-0.5 bg-slate-100/80">
              {MONTH_LABELS.map((label, index) => {
                const monthValue = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
                const now = new Date();
                const isCurrentMonth =
                  selectedYear === now.getFullYear() &&
                  index === now.getMonth();

                return (
                  <TabsTrigger
                    key={monthValue}
                    value={monthValue}
                    className={cn(
                      "text-xs font-medium rounded-md transition-all px-0",
                      "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                      isCurrentMonth && "data-[state=inactive]:text-blue-600 data-[state=inactive]:font-semibold"
                    )}
                  >
                    {label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Overview Section */}
        <PlanejamentoOverview budgetSummary={budgetSummary} />

        {/* Category Breakdown */}
        <PlanejamentoCategoryBreakdown
          budgetSummary={budgetSummary}
          categories={categories}
          expensesByCategory={expensesByCategory}
        />

        {/* Historical Trend */}
        <PlanejamentoHistorical
          data={historicalData}
          isLoading={historicalLoading}
        />

        {/* Projections */}
        <PlanejamentoProjections
          budgetSummary={budgetSummary}
          daysRemaining={daysRemaining}
          daysElapsed={daysElapsed}
        />

        {/* Recommendations */}
        <PlanejamentoRecommendations budgetSummary={budgetSummary} />
      </div>
    </PageShell>
  );
}
