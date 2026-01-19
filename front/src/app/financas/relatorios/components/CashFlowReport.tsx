'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { CashFlowReportData, ReportPeriod } from '@/types/reports';
import { cn } from '@/lib/utils';

interface CashFlowReportProps {
  accessToken: string;
  period: ReportPeriod;
  includePending: boolean;
  refreshKey: number;
}

export function CashFlowReport({
  accessToken,
  period,
  includePending,
  refreshKey,
}: CashFlowReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CashFlowReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getCashFlowReport(
          accessToken,
          period,
          includePending
        );
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, period, includePending, refreshKey]);

  if (loading) {
    return <CashFlowReportSkeleton />;
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

  const chartData = data.data.map((point) => ({
    ...point,
    income: point.income,
    expenses: -point.expenses,
    balance: point.balance,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const income = payload.find((p) => p.dataKey === 'income')?.value || 0;
      const expenses = Math.abs(payload.find((p) => p.dataKey === 'expenses')?.value || 0);
      const balance = payload.find((p) => p.dataKey === 'balance')?.value || 0;

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-emerald-600">Receitas:</span>
              <span className="text-xs font-medium">{formatCurrency(income)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-red-600">Despesas:</span>
              <span className="text-xs font-medium">{formatCurrency(expenses)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
              <span className="text-xs text-slate-600">Saldo:</span>
              <span className={cn(
                'text-xs font-semibold',
                balance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const isPositiveBalance = data.totals.net_balance >= 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            Total Receitas
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.totals.total_income)}
          </p>
          <p className="text-xs text-slate-400">
            Media: {formatCurrency(data.totals.average_monthly_income)}/mes
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ArrowDownRight className="h-4 w-4 text-red-500" />
            Total Despesas
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.totals.total_expenses)}
          </p>
          <p className="text-xs text-slate-400">
            Media: {formatCurrency(data.totals.average_monthly_expenses)}/mes
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4 text-blue-500" />
            Saldo Liquido
          </div>
          <p className={cn(
            'mt-1 text-2xl font-semibold',
            isPositiveBalance ? 'text-emerald-600' : 'text-red-600'
          )}>
            {formatCurrency(data.totals.net_balance)}
          </p>
          <p className="text-xs text-slate-400">
            No periodo de {period === '3m' ? '3' : period === '6m' ? '6' : '12'} meses
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {isPositiveBalance ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            Tendencia
          </div>
          <p className={cn(
            'mt-1 text-2xl font-semibold',
            isPositiveBalance ? 'text-emerald-600' : 'text-red-600'
          )}>
            {isPositiveBalance ? 'Positiva' : 'Negativa'}
          </p>
          <p className="text-xs text-slate-400">
            {isPositiveBalance
              ? 'Receitas superam despesas'
              : 'Despesas superam receitas'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-slate-900">
          Fluxo de Caixa Mensal
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month_label"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => formatCurrency(Math.abs(value)).replace('R$', '')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                switch (value) {
                  case 'income': return 'Receitas';
                  case 'expenses': return 'Despesas';
                  case 'balance': return 'Saldo';
                  default: return value;
                }
              }}
            />
            <Bar
              dataKey="income"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="income"
            />
            <Bar
              dataKey="expenses"
              fill="#ef4444"
              radius={[0, 0, 4, 4]}
              name="expenses"
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="balance"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Details Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Detalhamento Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Mes</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Receitas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Despesas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Saldo</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.month} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {row.month_label}/{row.month.split('-')[0].slice(-2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">
                    {formatCurrency(row.income)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right text-sm font-medium',
                    row.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {formatCurrency(row.balance)}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right text-sm',
                    row.cumulative_balance >= 0 ? 'text-blue-600' : 'text-red-600'
                  )}>
                    {formatCurrency(row.cumulative_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashFlowReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-32" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
