'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RefreshCw, TrendingDown, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency, RECURRENCE_FREQUENCY_LABELS, RecurrenceFrequency } from '@/types/finance';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import type { RecurringAnalysisReportData } from '@/types/reports';
import { cn } from '@/lib/utils';

interface RecurringAnalysisReportProps {
  accessToken: string;
  startDate: string;
  endDate: string;
  includePending: boolean;
  refreshKey: number;
}

export function RecurringAnalysisReport({
  accessToken,
  refreshKey,
}: RecurringAnalysisReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecurringAnalysisReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getRecurringAnalysisReport(accessToken);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, refreshKey]);

  if (loading) {
    return <RecurringAnalysisReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const pieData = [
    { name: 'Fixos', value: data.summary.total_fixed, color: '#3b82f6' },
    { name: 'Variaveis', value: data.summary.total_variable, color: '#22c55e' },
  ];

  const totalExpenses = data.summary.total_fixed + data.summary.total_variable;
  const isHighCommitment = data.income_commitment > 70;

  const expenseRecurrences = data.recurrences.filter((r) => r.type === 'DESPESA');
  const incomeRecurrences = data.recurrences.filter((r) => r.type === 'RECEITA');

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{d.name}</p>
          <p className="text-xs text-slate-600">
            {formatCurrency(d.value)} ({((d.value / totalExpenses) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Gastos Fixos
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.summary.total_fixed)}
          </p>
          <p className="text-xs text-slate-400">
            {data.summary.fixed_percentage.toFixed(1)}% do total
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingDown className="h-4 w-4 text-green-500" />
            Gastos Variaveis
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.summary.total_variable)}
          </p>
          <p className="text-xs text-slate-400">
            {data.summary.variable_percentage.toFixed(1)}% do total
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Recorrencias Ativas
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.summary.active_recurrences}
          </p>
          <p className="text-xs text-slate-400">
            de {data.summary.total_recurrences} cadastradas
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {isHighCommitment && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            Comprometimento
          </div>
          <p className={cn(
            'mt-1 text-2xl font-semibold',
            isHighCommitment ? 'text-amber-600' : 'text-slate-900'
          )}>
            {data.income_commitment.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">
            da renda com fixos
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      {isHighCommitment && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Alto comprometimento de renda
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Seus gastos fixos representam mais de 70% da sua renda mensal.
              Considere revisar suas despesas recorrentes para melhorar sua saude financeira.
            </p>
          </div>
        </div>
      )}

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Distribuicao: Fixos vs Variaveis
          </h3>
          {totalExpenses > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-sm text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-sm text-slate-400">Sem dados de gastos</p>
            </div>
          )}
        </div>

        {/* Income Commitment Gauge */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Comprometimento da Renda
          </h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={data.income_commitment > 70 ? '#f59e0b' : data.income_commitment > 50 ? '#3b82f6' : '#22c55e'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${data.income_commitment * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">
                  {data.income_commitment.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">comprometido</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                {data.income_commitment <= 50
                  ? 'Sua renda esta bem equilibrada!'
                  : data.income_commitment <= 70
                    ? 'Atencao ao nivel de comprometimento'
                    : 'Considere reduzir gastos fixos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recurrences Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Recurrences */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">
              Despesas Recorrentes ({expenseRecurrences.length})
            </h3>
          </div>
          {expenseRecurrences.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {expenseRecurrences.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3',
                    !rec.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={rec.category_icon}
                      color={rec.category_color}
                      size="sm"
                      withBackground
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {rec.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rec.category_name} • {RECURRENCE_FREQUENCY_LABELS[rec.frequency as RecurrenceFrequency] || rec.frequency}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">
                      {formatCurrency(rec.amount)}
                    </p>
                    {!rec.is_active && (
                      <p className="text-xs text-slate-400">Inativo</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-slate-400">Nenhuma despesa recorrente</p>
            </div>
          )}
        </div>

        {/* Income Recurrences */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">
              Receitas Recorrentes ({incomeRecurrences.length})
            </h3>
          </div>
          {incomeRecurrences.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {incomeRecurrences.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3',
                    !rec.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={rec.category_icon}
                      color={rec.category_color}
                      size="sm"
                      withBackground
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {rec.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rec.category_name} • {RECURRENCE_FREQUENCY_LABELS[rec.frequency as RecurrenceFrequency] || rec.frequency}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(rec.amount)}
                    </p>
                    {!rec.is_active && (
                      <p className="text-xs text-slate-400">Inativo</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-slate-400">Nenhuma receita recorrente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecurringAnalysisReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-7 w-24" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
