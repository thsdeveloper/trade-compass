'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import type { CategoryBreakdownReportData } from '@/types/reports';
import { cn } from '@/lib/utils';

interface CategoryBreakdownReportProps {
  accessToken: string;
  startDate: string;
  endDate: string;
  includePending: boolean;
  refreshKey: number;
}

export function CategoryBreakdownReport({
  accessToken,
  startDate,
  endDate,
  includePending,
  refreshKey,
}: CategoryBreakdownReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CategoryBreakdownReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getCategoryBreakdownReport(
          accessToken,
          startDate,
          endDate,
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
  }, [accessToken, startDate, endDate, includePending, refreshKey]);

  if (loading) {
    return <CategoryBreakdownReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Sem dados para o periodo selecionado</p>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = data.categories.slice(0, 8).map((cat) => ({
    name: cat.category_name,
    value: cat.total,
    percentage: cat.percentage,
    color: cat.category_color,
  }));

  // Prepare line chart data for top categories trend
  const allMonths = new Set<string>();
  data.top_categories.forEach((cat) => {
    cat.monthly_data.forEach((m) => allMonths.add(m.month));
  });
  const sortedMonths = Array.from(allMonths).sort();

  const trendData = sortedMonths.map((month) => {
    const point: Record<string, string | number> = {
      month: month.split('-')[1] + '/' + month.split('-')[0].slice(-2),
    };
    data.top_categories.forEach((cat) => {
      const monthData = cat.monthly_data.find((m) => m.month === month);
      point[cat.category_name] = monthData?.amount || 0;
    });
    return point;
  });

  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.name}</p>
          <p className="text-xs text-slate-600">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const changePercentage = data.comparison?.change_percentage || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LayoutGrid className="h-4 w-4" />
            Total de Gastos
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.total_expenses)}
          </p>
          <p className="text-xs text-slate-400">
            {data.categories.length} categorias
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Maior Gasto
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.categories[0]?.category_name || '-'}
          </p>
          <p className="text-xs text-slate-400">
            {formatCurrency(data.categories[0]?.total || 0)} ({data.categories[0]?.percentage.toFixed(0)}%)
          </p>
        </div>

        {data.comparison && (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Periodo Anterior
              </div>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(data.comparison.previous_period_total)}
              </p>
              <p className="text-xs text-slate-400">
                Comparacao
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {changePercentage > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : changePercentage < 0 ? (
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Minus className="h-4 w-4 text-slate-400" />
                )}
                Variacao
              </div>
              <p className={cn(
                'mt-1 text-2xl font-semibold',
                changePercentage > 0 ? 'text-red-600' : changePercentage < 0 ? 'text-emerald-600' : 'text-slate-600'
              )}>
                {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400">
                vs. periodo anterior
              </p>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Distribuicao por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {pieData.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-slate-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line Chart - Top Categories Trend */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Tendencia Top 5 Categorias
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
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
                {data.top_categories.map((cat) => (
                  <Line
                    key={cat.category_id}
                    type="monotone"
                    dataKey={cat.category_name}
                    stroke={cat.category_color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-slate-400">Sem dados de tendencia</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories List */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Todas as Categorias</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {data.categories.map((cat) => (
            <div
              key={cat.category_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon
                  icon={cat.category_icon}
                  color={cat.category_color}
                  size="sm"
                  withBackground
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {cat.category_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {cat.transaction_count} transacoes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(cat.total)}
                </p>
                <p className="text-xs text-slate-400">
                  {cat.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdownReportSkeleton() {
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
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
