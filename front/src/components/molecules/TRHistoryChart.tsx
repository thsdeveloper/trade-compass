'use client';

import { useMemo } from 'react';
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
import { formatCurrency } from '@/types/finance';

interface TRRate {
  reference_date: string;
  rate: number;
}

interface TRHistoryChartProps {
  trRates: TRRate[];
  financedAmount: number;
  className?: string;
}

export function TRHistoryChart({
  trRates,
  financedAmount,
  className,
}: TRHistoryChartProps) {
  const chartData = useMemo(() => {
    let cumulativeImpact = 0;
    let balanceWithTR = financedAmount;
    let balanceWithoutTR = financedAmount;
    const monthlyAmortization = financedAmount / 420; // SAC

    return trRates.map((tr, index) => {
      const trMonthly = tr.rate / 100;
      const trImpact = balanceWithTR * trMonthly;
      cumulativeImpact += trImpact;

      // Simulate balance evolution
      balanceWithTR = balanceWithTR + trImpact - monthlyAmortization;
      balanceWithoutTR = balanceWithoutTR - monthlyAmortization;

      const date = new Date(tr.reference_date);
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      return {
        month: monthLabel,
        date: tr.reference_date,
        trRate: tr.rate,
        trImpact: trImpact,
        cumulativeImpact: cumulativeImpact,
        balanceWithTR: Math.max(0, balanceWithTR),
        balanceWithoutTR: Math.max(0, balanceWithoutTR),
        difference: Math.max(0, balanceWithTR) - Math.max(0, balanceWithoutTR),
      };
    });
  }, [trRates, financedAmount]);

  const totalImpact = chartData.length > 0 ? chartData[chartData.length - 1].cumulativeImpact : 0;
  const averageTR = trRates.length > 0
    ? trRates.reduce((sum, tr) => sum + tr.rate, 0) / trRates.length
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-card p-3 shadow-md">
        <p className="text-xs font-medium text-slate-700 mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-muted-foreground">Taxa TR:</span>
            <span className="text-xs font-mono font-medium">{data.trRate.toFixed(4)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-muted-foreground">Impacto no mes:</span>
            <span className="text-xs font-mono font-medium text-amber-600">
              +{formatCurrency(data.trImpact)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1.5 border-t">
            <span className="text-[11px] text-muted-foreground">Impacto acumulado:</span>
            <span className="text-xs font-mono font-semibold text-red-600">
              +{formatCurrency(data.cumulativeImpact)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Historico da TR</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Impacto acumulado no seu saldo devedor
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">TR Media</p>
              <p className="text-sm font-mono font-semibold tabular-nums">{averageTR.toFixed(4)}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Impacto Total</p>
              <p className="text-sm font-mono font-semibold tabular-nums text-red-600">
                +{formatCurrency(totalImpact)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="tr"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                domain={[0, 'auto']}
                width={45}
              />
              <YAxis
                yAxisId="impact"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="tr" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Area
                yAxisId="tr"
                type="monotone"
                dataKey="trRate"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#trGradient)"
                name="Taxa TR"
              />
              <Area
                yAxisId="impact"
                type="monotone"
                dataKey="cumulativeImpact"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#impactGradient)"
                name="Impacto Acumulado"
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-500 rounded" />
            <span className="text-[11px] text-muted-foreground">Taxa TR (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-[11px] text-muted-foreground">Impacto Acumulado (R$)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
