'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { BudgetAnalysisReportData, ReportPeriod } from '@/types/reports';
import { cn } from '@/lib/utils';

interface BudgetAnalysisReportProps {
  accessToken: string;
  period: ReportPeriod;
  includePending: boolean;
  refreshKey: number;
}

const BUDGET_COLORS = {
  essencial: '#3b82f6',
  estilo_vida: '#22c55e',
  investimento: '#f59e0b',
};

const BUDGET_LABELS = {
  essencial: 'Essenciais (50%)',
  estilo_vida: 'Estilo de Vida (30%)',
  investimento: 'Investimentos (20%)',
};

export function BudgetAnalysisReport({
  accessToken,
  period,
  includePending,
  refreshKey,
}: BudgetAnalysisReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BudgetAnalysisReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getBudgetAnalysisReport(
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
    return <BudgetAnalysisReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.months.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Sem dados para o periodo selecionado</p>
      </div>
    );
  }

  // Prepare chart data for stacked bar chart
  const chartData = data.months.map((month) => ({
    month: month.month_label,
    essencial: month.allocations.essencial.percentage,
    estilo_vida: month.allocations.estilo_vida.percentage,
    investimento: month.allocations.investimento.percentage,
  }));

  // Prepare radar chart data
  const radarData = [
    {
      category: 'Essenciais',
      ideal: 50,
      real: data.average.essencial,
      fullMark: 100,
    },
    {
      category: 'Estilo de Vida',
      ideal: 30,
      real: data.average.estilo_vida,
      fullMark: 100,
    },
    {
      category: 'Investimentos',
      ideal: 20,
      real: data.average.investimento,
      fullMark: 100,
    },
  ];

  const getTrendIcon = () => {
    switch (data.trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case 'worsening':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-slate-400" />;
    }
  };

  const getTrendLabel = () => {
    switch (data.trend) {
      case 'improving':
        return 'Melhorando';
      case 'worsening':
        return 'Piorando';
      default:
        return 'Estavel';
    }
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; fill: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((p) => (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: p.fill }}
                  />
                  <span className="text-xs text-slate-600">
                    {BUDGET_LABELS[p.dataKey as keyof typeof BUDGET_LABELS]?.split('(')[0]}:
                  </span>
                </div>
                <span className="text-xs font-medium">{p.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate adherence score
  const getAdherenceScore = () => {
    const essencialDiff = Math.abs(data.average.essencial - 50);
    const estiloVidaDiff = Math.abs(data.average.estilo_vida - 30);
    const investimentoDiff = Math.abs(data.average.investimento - 20);
    const avgDiff = (essencialDiff + estiloVidaDiff + investimentoDiff) / 3;
    return Math.max(0, 100 - avgDiff * 2);
  };

  const adherenceScore = getAdherenceScore();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            Essenciais
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.average.essencial.toFixed(1)}%
          </p>
          <p className={cn(
            'text-xs',
            Math.abs(data.average.essencial - 50) <= 5 ? 'text-emerald-600' : 'text-amber-600'
          )}>
            Meta: 50%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            Estilo de Vida
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.average.estilo_vida.toFixed(1)}%
          </p>
          <p className={cn(
            'text-xs',
            Math.abs(data.average.estilo_vida - 30) <= 5 ? 'text-emerald-600' : 'text-amber-600'
          )}>
            Meta: 30%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            Investimentos
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.average.investimento.toFixed(1)}%
          </p>
          <p className={cn(
            'text-xs',
            Math.abs(data.average.investimento - 20) <= 5 ? 'text-emerald-600' : 'text-amber-600'
          )}>
            Meta: 20%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {getTrendIcon()}
            Tendencia
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {getTrendLabel()}
          </p>
          <p className="text-xs text-slate-400">
            Aderencia: {adherenceScore.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stacked Bar Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Evolucao Mensal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => BUDGET_LABELS[value as keyof typeof BUDGET_LABELS]?.split('(')[0] || value}
              />
              <ReferenceLine y={50} stroke="#3b82f6" strokeDasharray="3 3" />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" />
              <Bar dataKey="essencial" stackId="a" fill={BUDGET_COLORS.essencial} name="essencial" />
              <Bar dataKey="estilo_vida" stackId="a" fill={BUDGET_COLORS.estilo_vida} name="estilo_vida" />
              <Bar dataKey="investimento" stackId="a" fill={BUDGET_COLORS.investimento} name="investimento" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Comparativo: Ideal vs Real
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <Radar
                name="Ideal"
                dataKey="ideal"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Real"
                dataKey="real"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Details */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Detalhamento por Mes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Mes</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Renda</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Essenciais</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Estilo</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Invest.</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month) => {
                const isOnTrack =
                  month.allocations.essencial.status === 'on_track' &&
                  month.allocations.estilo_vida.status === 'on_track' &&
                  month.allocations.investimento.status === 'on_track';

                return (
                  <tr key={month.month} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {month.month_label}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {formatCurrency(month.total_income)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={cn(
                        'rounded px-1.5 py-0.5',
                        month.allocations.essencial.status === 'on_track'
                          ? 'bg-emerald-50 text-emerald-700'
                          : month.allocations.essencial.status === 'over_budget'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      )}>
                        {month.allocations.essencial.percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={cn(
                        'rounded px-1.5 py-0.5',
                        month.allocations.estilo_vida.status === 'on_track'
                          ? 'bg-emerald-50 text-emerald-700'
                          : month.allocations.estilo_vida.status === 'over_budget'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      )}>
                        {month.allocations.estilo_vida.percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={cn(
                        'rounded px-1.5 py-0.5',
                        month.allocations.investimento.status === 'on_track'
                          ? 'bg-emerald-50 text-emerald-700'
                          : month.allocations.investimento.status === 'over_budget'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      )}>
                        {month.allocations.investimento.percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOnTrack ? (
                        <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="mx-auto h-4 w-4 text-amber-500" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BudgetAnalysisReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
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
