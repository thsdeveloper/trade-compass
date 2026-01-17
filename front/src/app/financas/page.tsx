'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { FinanceDashboardSkeleton } from '@/components/organisms/skeletons/FinanceDashboardSkeleton';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import type {
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  FinanceCategory,
  AccountWithBank,
  FinanceCreditCard,
  BudgetSummary,
  YearSummary,
  GoalWithProgress,
  GoalSummary,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import { BudgetAllocationChart } from '@/components/molecules/BudgetAllocationChart';
import { BudgetProgressCards } from '@/components/molecules/BudgetProgressCards';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import { AccountsCard, CreditCardsCard } from '@/components/molecules/DashboardCards';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import { YearDashboard } from '@/components/organisms/finance/YearDashboard';
import { GoalsSummaryWidget } from '@/components/molecules/GoalsSummaryWidget';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinancasPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [yearSummary, setYearSummary] = useState<YearSummary | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Ref para evitar reload desnecessário
  const lastLoadedFiltersRef = useRef<string | null>(null);

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    const currentMonthNum = selectedMonth.split('-')[1];
    setSelectedMonth(`${newYear}-${currentMonthNum}`);
  };

  const loadDashboardData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    const filtersKey = JSON.stringify({ selectedMonth, viewMode, selectedYear });

    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (viewMode === 'year') {
        // Load year summary
        const [yearData, accountsData, cardsData] = await Promise.all([
          financeApi.getYearSummary(session.access_token, selectedYear),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
        ]);
        setYearSummary(yearData);
        setAccounts(accountsData);
        setCreditCards(cardsData);
      } else {
        // Load month data
        const [
          summaryData,
          expensesData,
          upcomingData,
          categoriesData,
          accountsData,
          cardsData,
          budgetData,
          goalsData,
          goalSummaryData,
        ] = await Promise.all([
          financeApi.getDashboardSummary(session.access_token, selectedMonth),
          financeApi.getExpensesByCategory(session.access_token, selectedMonth),
          financeApi.getUpcomingPayments(session.access_token, { month: selectedMonth }),
          financeApi.getCategories(session.access_token),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
          financeApi.getBudgetAllocation(session.access_token, selectedMonth),
          financeApi.getGoals(session.access_token, { status: 'ATIVO' }),
          financeApi.getGoalSummary(session.access_token),
        ]);

        setSummary(summaryData);
        setExpensesByCategory(expensesData);
        setUpcomingPayments(upcomingData);
        setCategories(categoriesData);
        setAccounts(accountsData);
        setCreditCards(cardsData);
        setBudgetSummary(budgetData);
        setGoals(goalsData);
        setGoalSummary(goalSummaryData);
      }

      lastLoadedFiltersRef.current = filtersKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth, viewMode, selectedYear]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadDashboardData();
  }, [user, authLoading, router, loadDashboardData]);

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadDashboardData(true);
  });

  if (authLoading || loading) {
    return <FinanceDashboardSkeleton />;
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
            onClick={() => loadDashboardData()}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.total, 0);

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Month Tabs */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleYearChange(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'year' ? 'month' : 'year')}
              className={cn(
                "text-sm font-semibold transition-colors px-2 py-1 rounded-md",
                viewMode === 'year'
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
              )}
              title={viewMode === 'year' ? 'Clique para ver por mes' : 'Clique para ver resumo anual'}
            >
              {selectedYear}
            </button>
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

        {/* Conditional render: Year View or Month View */}
        {viewMode === 'year' && yearSummary ? (
          <YearDashboard
            yearSummary={yearSummary}
            onMonthClick={(month) => {
              setSelectedMonth(month);
              setViewMode('month');
            }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Saldo Total"
                value={summary?.total_balance ?? 0}
                subtitle={`${accounts.length} conta${accounts.length !== 1 ? 's' : ''} ativa${accounts.length !== 1 ? 's' : ''}`}
                icon={Wallet}
                variant="default"
              />

              <SummaryCard
                title="A Pagar"
                value={summary?.total_pending_expenses ?? 0}
                subtitle={`Despesas de ${MONTH_LABELS[parseInt(selectedMonth.split('-')[1]) - 1]}`}
                icon={ArrowDownRight}
                variant="danger"
              />

              <SummaryCard
                title="A Receber"
                value={summary?.total_pending_income ?? 0}
                subtitle={`Receitas de ${MONTH_LABELS[parseInt(selectedMonth.split('-')[1]) - 1]}`}
                icon={ArrowUpRight}
                variant="success"
              />

              <SummaryCard
                title="Resultado"
                value={summary?.month_result ?? 0}
                subtitle="Receitas - Despesas"
                icon={TrendingUp}
                variant={summary && summary.month_result >= 0 ? 'success' : 'danger'}
              />
            </div>

        {/* Budget 50-30-20 Section */}
        {budgetSummary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-900">
                  Metodologia 50-30-20
                </h2>
                <p className="text-xs text-slate-400">
                  Acompanhe sua alocacao de despesas
                </p>
              </div>
              <a
                href="https://www.infomoney.com.br/minhas-financas/regra-50-30-20-conheca-um-metodo-para-organizar-suas-financas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Saiba mais
              </a>
            </div>
            <BudgetProgressCards
              allocations={budgetSummary.allocations}
              totalIncome={budgetSummary.total_income}
            />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-medium text-slate-700">
                Comparativo: Ideal vs Atual
              </h3>
              <BudgetAllocationChart
                allocations={budgetSummary.allocations}
                totalIncome={budgetSummary.total_income}
              />
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expenses by Category */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-medium text-slate-900">
                Despesas por Categoria
              </h2>
            </div>
            <div className="p-4">
              {expensesByCategory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-slate-400">
                    Nenhuma despesa registrada
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expensesByCategory.slice(0, 6).map((item) => (
                    <div key={item.category_id} className="group">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            icon={item.category_icon}
                            color={item.category_color}
                            size="sm"
                          />
                          <span className="font-medium text-slate-700">
                            {item.category_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-slate-900">
                            {formatCurrency(item.total)}
                          </span>
                          <span className="w-8 text-right text-xs tabular-nums text-slate-400">
                            {item.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.category_color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {totalExpenses > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm font-medium text-slate-500">Total</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-medium text-slate-900">
                Proximos Vencimentos
              </h2>
            </div>
            <div className="p-4">
              {upcomingPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-slate-400">
                    Nenhum vencimento proximo
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingPayments.slice(0, 6).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          icon={payment.category.icon}
                          color={payment.category.color}
                          size="sm"
                          withBackground
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {payment.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {payment.due_date.split('-').reverse().join('/')}
                            <span className="ml-1.5 text-slate-300">·</span>
                            <span
                              className={cn(
                                'ml-1.5',
                                payment.days_until_due <= 3
                                  ? 'text-amber-500'
                                  : 'text-slate-400'
                              )}
                            >
                              {payment.days_until_due === 0
                                ? 'Hoje'
                                : payment.days_until_due === 1
                                ? 'Amanha'
                                : `${payment.days_until_due} dias`}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-red-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goals Widget - only show if there's goal summary */}
        {goalSummary && (
          <GoalsSummaryWidget goals={goals} summary={goalSummary} />
        )}

        {/* Accounts & Credit Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AccountsCard accounts={accounts} />
          <CreditCardsCard creditCards={creditCards} />
        </div>

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            onClick={() => router.push('/financas/transacoes')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Transacoes</p>
              <p className="text-xs text-slate-400">Ver todas</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>

          <button
            onClick={() => router.push('/financas/objetivos')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Objetivos</p>
              <p className="text-xs text-slate-400">
                {goalSummary?.active_goals || 0} ativo{goalSummary?.active_goals !== 1 ? 's' : ''}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>

          <button
            onClick={() => router.push('/financas/dividas')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Dividas</p>
              <p className="text-xs text-slate-400">Gerenciar</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>

          <button
            onClick={() => router.push('/financas/categorias')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Categorias</p>
              <p className="text-xs text-slate-400">
                {categories.length} categoria{categories.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>

          <button
            onClick={() => router.push('/financas/recorrencias')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Recorrencias</p>
              <p className="text-xs text-slate-400">Gerenciar</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>
        </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
