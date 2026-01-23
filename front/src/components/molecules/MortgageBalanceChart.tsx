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
import type { MortgageInstallment } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MortgageBalanceChartProps {
  installments: MortgageInstallment[];
  className?: string;
}

export function MortgageBalanceChart({ installments, className }: MortgageBalanceChartProps) {
  const chartData = useMemo(() => {
    // Sample every N installments to keep chart readable
    const sampleRate = Math.max(1, Math.floor(installments.length / 60));
    return installments
      .filter((_, idx) => idx % sampleRate === 0 || idx === installments.length - 1)
      .map((inst) => {
        const date = new Date(inst.due_date + 'T00:00:00');
        return {
          installment: inst.installment_number,
          label: `${date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`,
          balance: inst.balance_after,
          status: inst.status,
          isPaid: inst.status === 'PAGA',
        };
      });
  }, [installments]);

  // Find where paid installments end
  const lastPaidIndex = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].isPaid) return i;
    }
    return -1;
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: (typeof chartData)[0];
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Parcela {data.installment}
          </p>
          <p className="text-xs text-slate-600 mb-2">{data.label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">Saldo:</span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(data.balance)}
            </span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                data.isPaid
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {data.isPaid ? 'Paga' : 'Pendente'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (installments.length === 0) {
    return (
      <div
        className={cn(
          'flex h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-white',
          className
        )}
      >
        <p className="text-sm text-slate-400">Nenhuma parcela gerada</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6', className)}>
      <h3 className="text-sm font-medium text-slate-700 mb-4">Evolucao do Saldo Devedor</h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBalancePaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={(value) =>
              `R$ ${(value / 1000).toFixed(0)}k`
            }
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reference line at current position */}
          {lastPaidIndex >= 0 && (
            <ReferenceLine
              x={chartData[lastPaidIndex].label}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{
                value: 'Atual',
                position: 'top',
                fontSize: 10,
                fill: '#10b981',
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="balance"
            stroke="#3b82f6"
            fill="url(#colorBalance)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600">Saldo devedor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-emerald-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-slate-600">Posicao atual</span>
        </div>
      </div>
    </div>
  );
}
