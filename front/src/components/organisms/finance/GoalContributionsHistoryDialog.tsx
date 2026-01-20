'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Receipt, HandCoins, Calendar, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { GoalWithProgress, GoalContributionItem } from '@/types/finance';

interface GoalContributionsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalWithProgress | null;
  accessToken: string;
}

export function GoalContributionsHistoryDialog({
  open,
  onOpenChange,
  goal,
  accessToken,
}: GoalContributionsHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState<GoalContributionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContributions() {
      if (!open || !goal || !accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const data = await financeApi.getGoalContributionHistory(goal.id, accessToken);
        // Ordenar por data decrescente
        setContributions(data.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar contribuicoes');
      } finally {
        setLoading(false);
      }
    }

    loadContributions();
  }, [open, goal, accessToken]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case 'PAGO':
        return (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            Pago
          </span>
        );
      case 'PENDENTE':
        return (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
            Pendente
          </span>
        );
      default:
        return null;
    }
  };

  const totalAmount = contributions
    .filter(c => c.type === 'manual' || c.status === 'PAGO')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Historico de Contribuicoes
          </DialogTitle>
          {goal && (
            <DialogDescription className="text-sm text-slate-500">
              {goal.name} - Meta: {formatCurrency(goal.target_amount)}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : contributions.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2">
              <Receipt className="h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-500">Nenhuma contribuicao registrada</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div>
                  <p className="text-xs text-slate-500">Total contribuido</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Contribuicoes</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {contributions.length}
                  </p>
                </div>
              </div>

              {/* Contributions List */}
              <div className="max-h-[350px] space-y-2 overflow-y-auto">
                {contributions.map((contribution) => (
                  <div
                    key={contribution.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      contribution.type === 'manual'
                        ? 'border-blue-100 bg-blue-50/30'
                        : 'border-slate-100 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                            contribution.type === 'manual'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-emerald-100 text-emerald-600'
                          )}
                        >
                          {contribution.type === 'manual' ? (
                            <HandCoins className="h-4 w-4" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {contribution.description}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 font-medium',
                                contribution.type === 'manual'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {contribution.type === 'manual' ? 'Manual' : 'Transacao'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(contribution.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-emerald-600">
                          +{formatCurrency(contribution.amount)}
                        </p>
                        {getStatusBadge(contribution.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-3 w-3 rounded bg-blue-100" />
                  <span>Contribuicao manual</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-3 w-3 rounded bg-slate-100" />
                  <span>Transacao vinculada</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
