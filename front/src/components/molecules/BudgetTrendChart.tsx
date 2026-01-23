'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAnalysisReportData } from '@/types/reports';
import { BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_IDEAL } from '@/types/finance';

interface BudgetTrendChartProps {
  data: BudgetAnalysisReportData;
  className?: string;
}

type PeriodFilter = '6m' | '12m';

export function BudgetTrendChart({ data, className }: BudgetTrendChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>('6m');

  const chartData = useMemo(() => {
    const months = period === '6m' ? data.months.slice(-6) : data.months;
    return months.map((month) => ({
      month: month.month_label,
      essencial: month.allocations.essencial.percentage,
      estilo_vida: month.allocations.estilo_vida.percentage,
      investimento: month.allocations.investimento.percentage,
      essencialAmount: month.allocations.essencial.amount,
      estiloVidaAmount: month.allocations.estilo_vida.amount,
      investimentoAmount: month.allocations.investimento.amount,
      income: month.total_income,
    }));
  }, [data.months, period]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      payload: typeof chartData[0];
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const monthData = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry) => {
              const categoryKey = entry.name as 'essencial' | 'estilo_vida' | 'investimento';
              const idealPercentage = BUDGET_CATEGORY_IDEAL[categoryKey.toUpperCase() as keyof typeof BUDGET_CATEGORY_IDEAL];
              const diff = entry.value - idealPercentage;

              return (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-slate-600">
                      {BUDGET_CATEGORY_LABELS[categoryKey.toUpperCase() as keyof typeof BUDGET_CATEGORY_LABELS]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-slate-900">
                      {entry.value.toFixed(1)}%
                    </span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        diff > 5 ? 'text-red-500' : diff < -5 ? 'text-blue-500' : 'text-slate-400'
                      )}
                    >
                      ({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.months.length === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-white', className)}>
        <p className="text-sm text-slate-400">
          Dados historicos insuficientes
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">
          Evolucao Historica
        </h3>
        <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
          <button
            onClick={() => setPeriod('6m')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-all',
              period === '6m'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            6 meses
          </button>
          <button
            onClick={() => setPeriod('12m')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-all',
              period === '12m'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            12 meses
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEssencial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BUDGET_CATEGORY_COLORS.ESSENCIAL} stopOpacity={0.3} />
              <stop offset="95%" stopColor={BUDGET_CATEGORY_COLORS.ESSENCIAL} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEstiloVida" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BUDGET_CATEGORY_COLORS.ESTILO_VIDA} stopOpacity={0.3} />
              <stop offset="95%" stopColor={BUDGET_CATEGORY_COLORS.ESTILO_VIDA} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInvestimento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BUDGET_CATEGORY_COLORS.INVESTIMENTO} stopOpacity={0.3} />
              <stop offset="95%" stopColor={BUDGET_CATEGORY_COLORS.INVESTIMENTO} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for ideal percentages */}
          <ReferenceLine
            y={50}
            stroke={BUDGET_CATEGORY_COLORS.ESSENCIAL}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={30}
            stroke={BUDGET_CATEGORY_COLORS.ESTILO_VIDA}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={20}
            stroke={BUDGET_CATEGORY_COLORS.INVESTIMENTO}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />

          <Area
            type="monotone"
            dataKey="essencial"
            name="essencial"
            stroke={BUDGET_CATEGORY_COLORS.ESSENCIAL}
            fill="url(#colorEssencial)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="estilo_vida"
            name="estilo_vida"
            stroke={BUDGET_CATEGORY_COLORS.ESTILO_VIDA}
            fill="url(#colorEstiloVida)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="investimento"
            name="investimento"
            stroke={BUDGET_CATEGORY_COLORS.INVESTIMENTO}
            fill="url(#colorInvestimento)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-100">
        {Object.entries(BUDGET_CATEGORY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-600">
              {BUDGET_CATEGORY_LABELS[key as keyof typeof BUDGET_CATEGORY_LABELS]}
            </span>
            <span className="text-xs text-slate-400">
              ({BUDGET_CATEGORY_IDEAL[key as keyof typeof BUDGET_CATEGORY_IDEAL]}%)
            </span>
          </div>
        ))}
      </div>

      {/* Trend indicator */}
      <div className="mt-3 text-center">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            data.trend === 'improving'
              ? 'bg-emerald-50 text-emerald-700'
              : data.trend === 'worsening'
                ? 'bg-red-50 text-red-700'
                : 'bg-slate-50 text-slate-600'
          )}
        >
          {data.trend === 'improving'
            ? 'Tendencia de melhora'
            : data.trend === 'worsening'
              ? 'Tendencia de piora'
              : 'Tendencia estavel'}
        </span>
      </div>
    </div>
  );
}
