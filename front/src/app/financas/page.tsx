'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import type {
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  FinanceCategory,
  FinanceAccount,
  FinanceCreditCard,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

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
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Generate month options (current + past 11 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  const loadDashboardData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const [
        summaryData,
        expensesData,
        upcomingData,
        categoriesData,
        accountsData,
        cardsData,
      ] = await Promise.all([
        financeApi.getDashboardSummary(session.access_token, selectedMonth),
        financeApi.getExpensesByCategory(session.access_token, selectedMonth),
        financeApi.getUpcomingPayments(session.access_token, 30),
        financeApi.getCategories(session.access_token),
        financeApi.getAccounts(session.access_token),
        financeApi.getCreditCards(session.access_token),
      ]);

      setSummary(summaryData);
      setExpensesByCategory(expensesData);
      setUpcomingPayments(upcomingData);
      setCategories(categoriesData);
      setAccounts(accountsData);
      setCreditCards(cardsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadDashboardData();
  }, [user, authLoading, router, loadDashboardData]);

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
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
            onClick={loadDashboardData}
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Financas
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie suas contas a pagar e receber
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-[160px] border-slate-200 bg-white text-sm font-medium text-slate-700">
                <SelectValue />
                <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
              </SelectTrigger>
              <SelectContent align="end">
                {monthOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm capitalize"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
              onClick={() => router.push('/financas/transacoes')}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nova transacao
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Saldo Total */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Saldo Total
              </span>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums tracking-tight',
                  summary && summary.total_balance >= 0
                    ? 'text-slate-900'
                    : 'text-red-600'
                )}
              >
                {summary ? formatCurrency(summary.total_balance) : '-'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {accounts.length} conta{accounts.length !== 1 ? 's' : ''} ativa{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* A Pagar */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                A Pagar
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded bg-red-50">
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-red-600">
                {summary ? formatCurrency(summary.total_pending_expenses) : '-'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Despesas pendentes</p>
          </div>

          {/* A Receber */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                A Receber
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-600">
                {summary ? formatCurrency(summary.total_pending_income) : '-'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Receitas pendentes</p>
          </div>

          {/* Resultado do Mes */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Resultado
              </span>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums tracking-tight',
                  summary && summary.month_result >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                )}
              >
                {summary ? formatCurrency(summary.month_result) : '-'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Receitas - Despesas</p>
          </div>
        </div>

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
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.category_color }}
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
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: payment.category.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {payment.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(payment.due_date).toLocaleDateString('pt-BR')}
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

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            onClick={() => router.push('/financas/cartoes')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Cartoes</p>
              <p className="text-xs text-slate-400">
                {creditCards.length} cartao{creditCards.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>

          <button
            onClick={() => router.push('/financas/contas')}
            className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Contas</p>
              <p className="text-xs text-slate-400">
                {accounts.length} conta{accounts.length !== 1 ? 's' : ''}
              </p>
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
        </div>
      </div>
    </PageShell>
  );
}
