'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { BudgetAllocation } from '@/types/finance';
import { BUDGET_CATEGORY_COLORS } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface BudgetAllocationChartProps {
  allocations: BudgetAllocation[];
  totalIncome: number;
}

// Cores para pago (mais escuro) e pendente (mais claro/listrado)
const getPaidColor = (category: string) => BUDGET_CATEGORY_COLORS[category as keyof typeof BUDGET_CATEGORY_COLORS];
const getPendingColor = (category: string) => {
  const baseColor = BUDGET_CATEGORY_COLORS[category as keyof typeof BUDGET_CATEGORY_COLORS];
  // Clarear a cor para pendente
  return baseColor + '60'; // Adiciona transparência
};

export function BudgetAllocationChart({
  allocations,
  totalIncome,
}: BudgetAllocationChartProps) {
  const chartData = allocations.map((allocation) => ({
    name: allocation.label,
    ideal: allocation.ideal_percentage,
    paid: allocation.paid_percentage,
    pending: allocation.pending_percentage,
    category: allocation.category,
    paidAmount: allocation.paid_amount,
    pendingAmount: allocation.pending_amount,
    actualAmount: allocation.actual_amount,
    idealAmount: totalIncome * (allocation.ideal_percentage / 100),
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const actualPercentage = data.paid + data.pending;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.name}</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">Ideal:</span>
              <span className="text-xs font-medium text-slate-700">
                {data.ideal}% ({formatCurrency(data.idealAmount)})
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: getPaidColor(data.category) }}
                  />
                  <span className="text-xs text-slate-500">Efetuado:</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">
                  {data.paid.toFixed(1)}% ({formatCurrency(data.paidAmount)})
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm border border-dashed"
                    style={{
                      backgroundColor: getPendingColor(data.category),
                      borderColor: getPaidColor(data.category)
                    }}
                  />
                  <span className="text-xs text-slate-500">Pendente:</span>
                </div>
                <span className="text-xs font-medium text-amber-600">
                  {data.pending.toFixed(1)}% ({formatCurrency(data.pendingAmount)})
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-slate-600">Total:</span>
                <span className="text-xs font-semibold text-slate-900">
                  {actualPercentage.toFixed(1)}% ({formatCurrency(data.actualAmount)})
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (totalIncome === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-slate-400">
          Sem receitas para calcular alocacao
        </p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#334155' }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />

          {/* Barra ideal (fundo mais claro) */}
          <Bar dataKey="ideal" radius={[0, 4, 4, 0]} barSize={20} fill="#e2e8f0" stackId="bg" />

          {/* Barra pago (cor sólida) */}
          <Bar dataKey="paid" radius={[0, 0, 0, 0]} barSize={20} stackId="actual">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-paid-${index}`}
                fill={getPaidColor(entry.category)}
              />
            ))}
          </Bar>

          {/* Barra pendente (cor mais clara) */}
          <Bar dataKey="pending" radius={[0, 4, 4, 0]} barSize={20} stackId="actual">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-pending-${index}`}
                fill={getPendingColor(entry.category)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-300" />
          <span className="text-xs text-slate-500">Meta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-500">Efetuado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/40" />
          <span className="text-xs text-slate-500">Pendente</span>
        </div>
      </div>
    </div>
  );
}
