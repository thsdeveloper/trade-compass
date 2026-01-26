'use client';

import { X } from 'lucide-react';
import { formatCurrency } from '@/types/finance';
import { cn } from '@/lib/utils';

interface SelectionSummary {
  count: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

interface SelectionSummaryBarProps {
  summary: SelectionSummary;
  onClear: () => void;
  className?: string;
}

export function SelectionSummaryBar({
  summary,
  onClear,
  className,
}: SelectionSummaryBarProps) {
  if (summary.count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-slate-700">
          {summary.count} {summary.count === 1 ? 'selecionada' : 'selecionadas'}
        </span>

        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          {summary.totalIncome > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Receitas:</span>
              <span className="text-sm font-semibold tabular-nums text-emerald-600">
                +{formatCurrency(summary.totalIncome)}
              </span>
            </div>
          )}

          {summary.totalExpense > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Despesas:</span>
              <span className="text-sm font-semibold tabular-nums text-red-600">
                -{formatCurrency(summary.totalExpense)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
            <span className="text-xs text-slate-500">Total:</span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                summary.netAmount >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {summary.netAmount >= 0 ? '+' : ''}
              {formatCurrency(summary.netAmount)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onClear}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        title="Limpar selecao"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
