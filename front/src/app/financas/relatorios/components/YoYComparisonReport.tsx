'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { YoYComparisonReportData } from '@/types/reports';
import { cn } from '@/lib/utils';

interface YoYComparisonReportProps {
  accessToken: string;
  years: number[];
  refreshKey: number;
}

const YEAR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b'];

export function YoYComparisonReport({
  accessToken,
  years,
  refreshKey,
}: YoYComparisonReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<YoYComparisonReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'income' | 'expenses' | 'balance'>('balance');

  useEffect(() => {
    async function loadData() {
      if (!accessToken || years.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getYoYComparisonReport(accessToken, years);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, years, refreshKey]);

  if (loading) {
    return <YoYComparisonReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.years.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Selecione ao menos um ano para comparar</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.monthly_comparison.map((month) => {
    const point: Record<string, string | number> = {
      month: month.month_label,
    };
    data.years.forEach((year) => {
      const yearData = month.data[year];
      if (yearData) {
        point[`${year}_income`] = yearData.income;
        point[`${year}_expenses`] = yearData.expenses;
        point[`${year}_balance`] = yearData.balance;
      }
    });
    return point;
  });

  // Get data key suffix based on chart type
  const getDataKey = (year: number) => {
    switch (chartType) {
      case 'income': return `${year}_income`;
      case 'expenses': return `${year}_expenses`;
      case 'balance': return `${year}_balance`;
    }
  };

  // Calculate YoY changes
  const getYoYChange = (currentYear: number, previousYear: number) => {
    const current = data.yearly_totals.find((y) => y.year === currentYear);
    const previous = data.yearly_totals.find((y) => y.year === previousYear);

    if (!current || !previous) return null;

    return {
      income: previous.total_income > 0
        ? ((current.total_income - previous.total_income) / previous.total_income) * 100
        : 0,
      expenses: previous.total_expenses > 0
        ? ((current.total_expenses - previous.total_expenses) / previous.total_expenses) * 100
        : 0,
      balance: previous.total_balance !== 0
        ? ((current.total_balance - previous.total_balance) / Math.abs(previous.total_balance)) * 100
        : 0,
    };
  };

  const sortedYears = [...data.years].sort((a, b) => b - a);
  const yoyChange = sortedYears.length >= 2
    ? getYoYChange(sortedYears[0], sortedYears[1])
    : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.yearly_totals.slice(0, 3).map((yearData, index) => (
          <div
            key={yearData.year}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: YEAR_COLORS[index] }}
              />
              Ano {yearData.year}
            </div>
            <p className={cn(
              'mt-1 text-2xl font-semibold',
              yearData.total_balance >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {formatCurrency(yearData.total_balance)}
            </p>
            <p className="text-xs text-slate-400">
              Receitas: {formatCurrency(yearData.total_income)}
            </p>
          </div>
        ))}

        {yoyChange && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {yoyChange.balance > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : yoyChange.balance < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              Variacao YoY
            </div>
            <p className={cn(
              'mt-1 text-2xl font-semibold',
              yoyChange.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {yoyChange.balance > 0 ? '+' : ''}{yoyChange.balance.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              Saldo {sortedYears[0]} vs {sortedYears[1]}
            </p>
          </div>
        )}
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setChartType('balance')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            chartType === 'balance'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Saldo
        </button>
        <button
          onClick={() => setChartType('income')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            chartType === 'income'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Receitas
        </button>
        <button
          onClick={() => setChartType('expenses')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            chartType === 'expenses'
              ? 'bg-red-50 text-red-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Despesas
        </button>
      </div>

      {/* Main Chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-medium text-slate-900">
          Comparativo Mensal - {chartType === 'balance' ? 'Saldo' : chartType === 'income' ? 'Receitas' : 'Despesas'}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend />
            {data.years.map((year, index) => (
              <Line
                key={year}
                type="monotone"
                dataKey={getDataKey(year)}
                name={String(year)}
                stroke={YEAR_COLORS[index]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Summary Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Resumo por Ano</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Ano</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total Receitas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total Despesas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Saldo</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Media Mensal</th>
              </tr>
            </thead>
            <tbody>
              {data.yearly_totals.map((yearData, index) => (
                <tr key={yearData.year} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: YEAR_COLORS[index] }}
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {yearData.year}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600">
                    {formatCurrency(yearData.total_income)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {formatCurrency(yearData.total_expenses)}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right text-sm font-medium',
                    yearData.total_balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {formatCurrency(yearData.total_balance)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">
                    {formatCurrency(yearData.average_monthly_income - yearData.average_monthly_expenses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Comparison Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Comparativo Mensal Detalhado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Mes</th>
                {data.years.map((year) => (
                  <th key={year} className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.monthly_comparison.map((month) => (
                <tr key={month.month} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {month.month_label}
                  </td>
                  {data.years.map((year, index) => {
                    const yearData = month.data[year];
                    const balance = yearData?.balance || 0;
                    return (
                      <td
                        key={year}
                        className={cn(
                          'px-4 py-3 text-right text-sm',
                          balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {yearData ? formatCurrency(balance) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function YoYComparisonReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-28" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <Skeleton className="mb-4 h-5 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
