'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { MortgageInstallment } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MortgagePaymentChartProps {
  installments: MortgageInstallment[];
  className?: string;
}

export function MortgagePaymentChart({ installments, className }: MortgagePaymentChartProps) {
  const chartData = useMemo(() => {
    // Group by year for a cleaner view
    const byYear: Record<
      string,
      {
        amortization: number;
        interest: number;
        insurance: number;
        fees: number;
        total: number;
        count: number;
      }
    > = {};

    installments.forEach((inst) => {
      const year = inst.due_date.substring(0, 4);
      if (!byYear[year]) {
        byYear[year] = {
          amortization: 0,
          interest: 0,
          insurance: 0,
          fees: 0,
          total: 0,
          count: 0,
        };
      }
      byYear[year].amortization += inst.amortization_amount;
      byYear[year].interest += inst.interest_amount;
      byYear[year].insurance += inst.mip_insurance + inst.dfi_insurance;
      byYear[year].fees += inst.admin_fee;
      byYear[year].total += inst.total_amount;
      byYear[year].count += 1;
    });

    return Object.entries(byYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, data]) => ({
        year,
        amortization: data.amortization,
        interest: data.interest,
        insurance: data.insurance,
        fees: data.fees,
        total: data.total,
        count: data.count,
      }));
  }, [installments]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, d) => ({
        amortization: acc.amortization + d.amortization,
        interest: acc.interest + d.interest,
        insurance: acc.insurance + d.insurance,
        fees: acc.fees + d.fees,
        total: acc.total + d.total,
      }),
      { amortization: 0, interest: 0, insurance: 0, fees: 0, total: 0 }
    );
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      payload: (typeof chartData)[0];
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-600">Amortizacao</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-slate-900">
                {formatCurrency(data.amortization)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-slate-600">Juros</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-slate-900">
                {formatCurrency(data.interest)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-600">Seguros</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-slate-900">
                {formatCurrency(data.insurance)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-600">Total</span>
              <span className="text-xs font-semibold tabular-nums text-slate-900">
                {formatCurrency(data.total)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{data.count} parcelas</p>
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
      <h3 className="text-sm font-medium text-slate-700 mb-4">
        Composicao dos Pagamentos por Ano
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="amortization"
            name="Amortizacao"
            stackId="a"
            fill="#10b981"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="interest"
            name="Juros"
            stackId="a"
            fill="#ef4444"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="insurance"
            name="Seguros"
            stackId="a"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend + Totals */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Amortizacao</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(totals.amortization)}
          </span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-600">Juros</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(totals.interest)}
          </span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">Seguros</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(totals.insurance)}
          </span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-600">Total</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(totals.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
