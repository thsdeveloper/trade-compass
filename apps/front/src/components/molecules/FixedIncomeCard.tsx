'use client';

import { Landmark, Calendar, TrendingUp, Clock, Plus, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  formatCurrency,
  FIXED_INCOME_TYPE_LABELS,
  FIXED_INCOME_STATUS_LABELS,
  getFixedIncomeStatusBgColor,
  formatRateDisplay,
} from '@/types/finance';
import type { FixedIncomeWithContributions } from '@/types/finance';

interface FixedIncomeCardProps {
  investment: FixedIncomeWithContributions;
  compact?: boolean;
  onClick?: () => void;
  onAddContribution?: () => void;
  onViewHistory?: () => void;
}

export function FixedIncomeCard({
  investment,
  compact,
  onClick,
  onAddContribution,
  onViewHistory,
}: FixedIncomeCardProps) {
  const progressPercentage = Math.min(investment.progress_percentage, 100);

  // Get color based on yield
  const getYieldColor = (yield_: number) => {
    if (yield_ > 0) return 'text-emerald-600';
    if (yield_ < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  // Get progress bar color based on status
  const getProgressColor = () => {
    if (investment.status === 'VENCIDO') return 'bg-amber-500';
    if (investment.status === 'RESGATADO') return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 transition-all',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Landmark className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{investment.name}</p>
            <p className="text-xs text-slate-500">{investment.issuer}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {FIXED_INCOME_TYPE_LABELS[investment.investment_type]}
          </span>
          <span className={cn('rounded px-2 py-0.5 text-xs font-medium', getFixedIncomeStatusBgColor(investment.status))}>
            {FIXED_INCOME_STATUS_LABELS[investment.status]}
          </span>
        </div>
      </div>

      {/* Rate Display */}
      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">Taxa</p>
        <p className="text-sm font-semibold text-slate-900">
          {formatRateDisplay(
            investment.rate_type,
            investment.rate_value,
            investment.rate_index,
            investment.rate_spread
          )}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">Progresso</span>
          <span className="text-xs font-medium tabular-nums text-slate-600">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all', getProgressColor())}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Values */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400">Investido</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(investment.amount_invested)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Atual</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(investment.current_value ?? investment.amount_invested)}
          </p>
        </div>
      </div>

      {/* Yield */}
      <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500">Rendimento</span>
        </div>
        <div className="text-right">
          <span className={cn('text-sm font-semibold tabular-nums', getYieldColor(investment.gross_yield))}>
            {formatCurrency(investment.gross_yield)}
          </span>
          <span className={cn('ml-1 text-xs', getYieldColor(investment.gross_yield))}>
            ({investment.gross_yield_percentage >= 0 ? '+' : ''}{investment.gross_yield_percentage.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Dates */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Compra: {new Date(investment.purchase_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Venc: {new Date(investment.maturity_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      {/* Days to Maturity */}
      {!compact && investment.status === 'ATIVO' && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-400">
            {investment.days_to_maturity > 0
              ? `${investment.days_to_maturity} dias para o vencimento`
              : 'Vencido'}
          </span>
        </div>
      )}

      {/* Contributions Section */}
      {!compact && investment.status === 'ATIVO' && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {investment.contributions_count > 0 && (
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>{investment.contributions_count} aporte(s) adicional(is)</span>
              <span className="font-medium text-emerald-600">
                +{formatCurrency(investment.total_contributions)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAddContribution?.();
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo aporte
            </Button>
            {investment.contributions_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHistory?.();
                }}
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                Historico
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
