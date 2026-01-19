'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CreditCard, Wallet, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { PaymentMethodsReportData, ReportPeriod } from '@/types/reports';
import { cn } from '@/lib/utils';

interface PaymentMethodsReportProps {
  accessToken: string;
  period: ReportPeriod;
  includePending: boolean;
  refreshKey: number;
}

export function PaymentMethodsReport({
  accessToken,
  period,
  includePending,
  refreshKey,
}: PaymentMethodsReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentMethodsReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getPaymentMethodsReport(
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
    return <PaymentMethodsReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const donutData = [
    { name: 'Contas', value: data.summary.total_account_payments, color: '#3b82f6' },
    { name: 'Cartoes', value: data.summary.total_card_payments, color: '#f59e0b' },
  ];

  const totalPayments = data.summary.total_account_payments + data.summary.total_card_payments;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{d.name}</p>
          <p className="text-xs text-slate-600">
            {formatCurrency(d.value)} ({((d.value / totalPayments) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4 text-blue-500" />
            Pagamentos em Conta
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.summary.total_account_payments)}
          </p>
          <p className="text-xs text-slate-400">
            {data.summary.account_percentage.toFixed(1)}% do total
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CreditCard className="h-4 w-4 text-amber-500" />
            Pagamentos em Cartao
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(data.summary.total_card_payments)}
          </p>
          <p className="text-xs text-slate-400">
            {data.summary.card_percentage.toFixed(1)}% do total
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Total de Pagamentos
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(totalPayments)}
          </p>
          <p className="text-xs text-slate-400">
            No periodo de {period === '3m' ? '3' : period === '6m' ? '6' : '12'} meses
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Cartoes de Credito
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.credit_cards.length}
          </p>
          <p className="text-xs text-slate-400">
            {data.credit_cards.filter((c) => c.usage_percentage > 80).length} com uso elevado
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Distribuicao de Pagamentos
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-sm text-slate-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Card Usage */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-slate-900">
            Utilizacao de Limite dos Cartoes
          </h3>
          {data.credit_cards.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.credit_cards}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, _name, props) => {
                    const payload = props.payload as { total_limit: number; used_amount: number };
                    return [
                      `${Number(value).toFixed(1)}% (${formatCurrency(payload.used_amount)} de ${formatCurrency(payload.total_limit)})`,
                      'Utilizacao'
                    ];
                  }}
                />
                <Bar
                  dataKey="usage_percentage"
                  radius={[0, 4, 4, 0]}
                >
                  {data.credit_cards.map((card, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={card.usage_percentage > 80 ? '#ef4444' : card.usage_percentage > 50 ? '#f59e0b' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-sm text-slate-400">Nenhum cartao de credito</p>
            </div>
          )}
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts List */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">Pagamentos por Conta</h3>
          </div>
          {data.accounts.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {data.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <Wallet
                        className="h-4 w-4"
                        style={{ color: account.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {account.transaction_count} transacoes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(account.total)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {account.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-slate-400">Nenhum pagamento em conta</p>
            </div>
          )}
        </div>

        {/* Credit Cards List */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">Pagamentos por Cartao</h3>
          </div>
          {data.credit_cards.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {data.credit_cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCard
                        className="h-4 w-4"
                        style={{ color: card.color }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {card.name}
                        </p>
                        {card.usage_percentage > 80 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {card.brand} • {card.transaction_count} transacoes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(card.used_amount)}
                    </p>
                    <p className={cn(
                      'text-xs',
                      card.usage_percentage > 80 ? 'text-red-500' : 'text-slate-400'
                    )}>
                      {card.usage_percentage.toFixed(1)}% do limite
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-slate-400">Nenhum pagamento em cartao</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-7 w-28" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
