'use client';

import Link from 'next/link';
import { Building2, Calendar, Percent, ArrowRight, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { MortgageWithProgress, MortgageWithBank } from '@/types/finance';
import {
  formatCurrency,
  MORTGAGE_STATUS_LABELS,
  getMortgageStatusBgColor,
  MORTGAGE_AMORTIZATION_LABELS,
  MORTGAGE_RATE_INDEX_LABELS,
} from '@/types/finance';

interface MortgageProgressCardProps {
  mortgage: MortgageWithProgress | MortgageWithBank;
  onClick?: () => void;
}

function isMortgageWithProgress(
  mortgage: MortgageWithProgress | MortgageWithBank
): mortgage is MortgageWithProgress {
  return 'progress_percentage' in mortgage;
}

export function MortgageProgressCard({ mortgage, onClick }: MortgageProgressCardProps) {
  const hasProgress = isMortgageWithProgress(mortgage);
  const progress = hasProgress ? mortgage.progress_percentage : 0;
  const currentBalance = mortgage.current_balance || mortgage.financed_amount;
  const activeRate = mortgage.is_reduced_rate_active
    ? mortgage.reduced_annual_rate || mortgage.base_annual_rate
    : mortgage.base_annual_rate;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const content = (
    <div className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{mortgage.institution_name}</h3>
            <p className="text-xs text-muted-foreground">{mortgage.contract_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getMortgageStatusBgColor(mortgage.status)}>
            {MORTGAGE_STATUS_LABELS[mortgage.status]}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saldo Devedor</span>
          <span className="font-medium">{formatCurrency(currentBalance)}</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground">
            <span>{mortgage.paid_installments} pagas</span>
            <span>{mortgage.total_installments - mortgage.paid_installments} restantes</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Percent className="h-3 w-3" />
              <span className="text-[10px]">Taxa</span>
            </div>
            <p className="text-xs font-medium">
              {activeRate.toFixed(2)}% + {MORTGAGE_RATE_INDEX_LABELS[mortgage.rate_index]}
            </p>
          </div>
          <div className="text-center border-x">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span className="text-[10px]">Sistema</span>
            </div>
            <p className="text-xs font-medium">
              {MORTGAGE_AMORTIZATION_LABELS[mortgage.amortization_system]}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span className="text-[10px]">Inicio</span>
            </div>
            <p className="text-xs font-medium">{formatDate(mortgage.first_installment_date)}</p>
          </div>
        </div>

        {hasProgress && mortgage.next_installment && (
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs">
            <div>
              <span className="text-muted-foreground">Proxima parcela:</span>
              <span className="font-medium ml-1">
                {formatDate(mortgage.next_installment.due_date)}
              </span>
            </div>
            <span className="font-semibold text-primary">
              {formatCurrency(mortgage.next_installment.total_amount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/financas/financiamentos/${mortgage.id}`}>
      {content}
    </Link>
  );
}
