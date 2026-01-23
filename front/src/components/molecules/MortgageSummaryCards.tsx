'use client';

import { Building2, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import type { MortgageSummary } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MortgageSummaryCardsProps {
  summary: MortgageSummary;
}

export function MortgageSummaryCards({ summary }: MortgageSummaryCardsProps) {
  const cards = [
    {
      title: 'Financiamentos',
      value: summary.active_mortgages.toString(),
      subtitle: `${summary.total_mortgages} total`,
      icon: Building2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Financiado',
      value: formatCurrency(summary.total_financed),
      subtitle: 'Valor original',
      icon: DollarSign,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Saldo Devedor',
      value: formatCurrency(summary.total_current_balance),
      subtitle: `${formatCurrency(summary.total_paid)} pago`,
      icon: TrendingUp,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Progresso',
      value: `${summary.overall_progress.toFixed(1)}%`,
      subtitle: 'Quitado',
      icon: Calendar,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-lg border bg-card p-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              <p className="text-xl font-semibold tracking-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            <div className={`rounded-lg p-2 ${card.iconBg}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
