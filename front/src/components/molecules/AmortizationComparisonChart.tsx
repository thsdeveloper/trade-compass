'use client';

import { useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculatedInstallment } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface AmortizationComparisonChartProps {
  originalInstallments: CalculatedInstallment[];
  simulatedInstallments: CalculatedInstallment[];
  className?: string;
}

export function AmortizationComparisonChart({
  originalInstallments,
  simulatedInstallments,
  className,
}: AmortizationComparisonChartProps) {
  const chartData = useMemo(() => {
    const maxLength = Math.max(originalInstallments.length, simulatedInstallments.length);
    const sampleRate = Math.max(1, Math.floor(maxLength / 40));

    const data: Array<{
      month: number;
      label: string;
      original: number | null;
      simulated: number | null;
    }> = [];

    for (let i = 0; i < maxLength; i += sampleRate) {
      const originalInst = originalInstallments[i];
      const simulatedInst = simulatedInstallments[i];

      const label = originalInst
        ? new Date(originalInst.due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit',
          })
        : simulatedInst
        ? new Date(simulatedInst.due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit',
          })
        : '';

      data.push({
        month: i + 1,
        label,
        original: originalInst?.balance_after ?? null,
        simulated: simulatedInst?.balance_after ?? null,
      });
    }

    // Ensure we include the last points
    const lastOriginal = originalInstallments[originalInstallments.length - 1];
    const lastSimulated = simulatedInstallments[simulatedInstallments.length - 1];

    if (lastOriginal && data[data.length - 1]?.month !== originalInstallments.length) {
      data.push({
        month: originalInstallments.length,
        label: new Date(lastOriginal.due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        }),
        original: lastOriginal.balance_after,
        simulated: null,
      });
    }

    return data.sort((a, b) => a.month - b.month);
  }, [originalInstallments, simulatedInstallments]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number | null;
      dataKey: string;
      color: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-xs text-slate-500 mb-2">{label}</p>
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-slate-600">
                  {entry.dataKey === 'original' ? 'Original' : 'Com aportes'}
                </span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {entry.value !== null ? formatCurrency(entry.value) : '-'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (originalInstallments.length === 0 && simulatedInstallments.length === 0) {
    return null;
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-primary" />
          Evolucao do Saldo Devedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={65}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-slate-600">
                  {value === 'original' ? 'Cenario original' : 'Com aportes'}
                </span>
              )}
            />

            <Line
              type="monotone"
              dataKey="original"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="original"
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="simulated"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="simulated"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-2 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-slate-400" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs text-slate-600">Original</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-emerald-500" />
            <span className="text-xs text-slate-600">Com aportes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
