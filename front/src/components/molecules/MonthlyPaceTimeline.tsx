'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
} from '@/types/finance';

interface MonthlyPaceTimelineProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
  daysElapsed: number;
  daysInMonth: number;
  className?: string;
}

export function MonthlyPaceTimeline({
  allocations,
  totalIncome,
  daysElapsed,
  daysInMonth,
  className,
}: MonthlyPaceTimelineProps) {
  const { chartData, idealLineData, safeZoneData } = useMemo(() => {
    // Generate data points for each day of the month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Calculate ideal daily amounts for each category
    const categoryIdealDaily = allocations.map((allocation) => {
      const idealAmount = (totalIncome * allocation.ideal_percentage) / 100;
      return {
        category: allocation.category,
        dailyAmount: idealAmount / daysInMonth,
        totalIdeal: idealAmount,
      };
    });

    // Simulate cumulative spending - linear projection based on current spending
    const actualDailyByCategory = allocations.map((allocation) => ({
      category: allocation.category,
      dailyAmount: daysElapsed > 0 ? allocation.actual_amount / daysElapsed : 0,
      currentTotal: allocation.actual_amount,
    }));

    // Build chart data
    const data = days.map((day) => {
      const point: Record<string, number | string> = { day };

      // Add ideal cumulative for reference
      let totalIdealCumulative = 0;
      categoryIdealDaily.forEach((cat) => {
        totalIdealCumulative += cat.dailyAmount * day;
      });
      point.idealTotal = totalIdealCumulative;

      // Add actual/projected cumulative for each category
      allocations.forEach((allocation, idx) => {
        const ideal = categoryIdealDaily[idx];
        const actual = actualDailyByCategory[idx];

        if (day <= daysElapsed) {
          // Past days: use projected linear amount based on actual daily rate
          point[allocation.category] = actual.dailyAmount * day;
        } else {
          // Future days: project from current point
          point[allocation.category] = actual.currentTotal + actual.dailyAmount * (day - daysElapsed);
        }

        // Ideal line for each category
        point[`${allocation.category}_ideal`] = ideal.dailyAmount * day;
      });

      // Safe zone boundaries (±10% of total ideal)
      point.safeZoneUpper = totalIdealCumulative * 1.1;
      point.safeZoneLower = totalIdealCumulative * 0.9;

      return point;
    });

    // Ideal line data
    const idealLine = days.map((day) => ({
      day,
      value: categoryIdealDaily.reduce((sum, cat) => sum + cat.dailyAmount * day, 0),
    }));

    // Safe zone data
    const safeZone = days.map((day) => {
      const idealTotal = categoryIdealDaily.reduce((sum, cat) => sum + cat.dailyAmount * day, 0);
      return {
        day,
        upper: idealTotal * 1.1,
        lower: idealTotal * 0.9,
      };
    });

    return {
      chartData: data,
      idealLineData: idealLine,
      safeZoneData: safeZone,
    };
  }, [allocations, totalIncome, daysElapsed, daysInMonth]);

  const maxValue = useMemo(() => {
    const max = Math.max(
      ...chartData.map((d) => {
        const values = Object.entries(d)
          .filter(([key]) => key !== 'day')
          .map(([_, val]) => (typeof val === 'number' ? val : 0));
        return Math.max(...values);
      })
    );
    return max * 1.1;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (active && payload && payload.length && label !== undefined) {
      const isPast = label <= daysElapsed;
      const isToday = label === daysElapsed;

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-slate-900">
              Dia {label}
              {isToday && (
                <span className="ml-1 text-xs text-blue-600">(Hoje)</span>
              )}
              {!isPast && !isToday && (
                <span className="ml-1 text-xs text-slate-400">(Projecao)</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            {payload
              .filter((p) => !p.name.includes('_ideal') && !p.name.includes('Zone') && p.name !== 'idealTotal')
              .map((item) => {
                const category = item.name as keyof typeof BUDGET_CATEGORY_LABELS;
                const label = BUDGET_CATEGORY_LABELS[category] || item.name;
                const color = BUDGET_CATEGORY_COLORS[category] || item.color;

                return (
                  <div key={item.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-slate-600">{label}:</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-slate-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (totalIncome === 0) {
    return (
      <div className={cn('flex h-[200px] items-center justify-center', className)}>
        <p className="text-sm text-slate-400">
          Sem receitas para exibir linha do tempo
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="mb-1 text-sm font-medium text-slate-700">
        Linha do Tempo Mensal
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Progresso de gastos ao longo do mes (zona sombreada = ±10% do ideal)
      </p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={Math.floor(daysInMonth / 7)}
            />
            <YAxis
              domain={[0, maxValue]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
              width={40}
            />

            {/* Safe zone area */}
            <Area
              type="monotone"
              dataKey="safeZoneUpper"
              stroke="none"
              fill="#22c55e"
              fillOpacity={0.1}
            />
            <Area
              type="monotone"
              dataKey="safeZoneLower"
              stroke="none"
              fill="#fff"
              fillOpacity={1}
            />

            {/* Ideal line (dashed) */}
            <Area
              type="monotone"
              dataKey="idealTotal"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
            />

            {/* Category lines */}
            {allocations.map((allocation) => (
              <Area
                key={allocation.category}
                type="monotone"
                dataKey={allocation.category}
                stroke={BUDGET_CATEGORY_COLORS[allocation.category]}
                strokeWidth={2}
                fill={BUDGET_CATEGORY_COLORS[allocation.category]}
                fillOpacity={0.1}
              />
            ))}

            {/* Today marker */}
            {daysElapsed > 0 && daysElapsed < daysInMonth && (
              <ReferenceLine
                x={daysElapsed}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Hoje',
                  position: 'top',
                  fontSize: 10,
                  fill: '#3b82f6',
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
          <span className="text-slate-600">Ritmo Ideal</span>
        </div>
        {allocations.map((allocation) => (
          <div key={allocation.category} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: BUDGET_CATEGORY_COLORS[allocation.category] }}
            />
            <span className="text-slate-600">
              {BUDGET_CATEGORY_LABELS[allocation.category]}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-500/10" />
          <span className="text-slate-600">Zona Segura</span>
        </div>
      </div>
    </div>
  );
}
