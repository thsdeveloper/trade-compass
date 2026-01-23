'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Receipt, HandCoins, Calendar, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { FixedIncomeWithContributions, FixedIncomeContribution } from '@/types/finance';

interface FixedIncomeContributionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: FixedIncomeWithContributions | null;
  accessToken: string;
  onContributionDeleted?: () => void;
}

export function FixedIncomeContributionHistoryDialog({
  open,
  onOpenChange,
  investment,
  accessToken,
  onContributionDeleted,
}: FixedIncomeContributionHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState<FixedIncomeContribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadContributions() {
      if (!open || !investment || !accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const data = await financeApi.getFixedIncomeContributions(investment.id, accessToken);
        // Sort by date descending
        setContributions(data.sort((a, b) => b.contribution_date.localeCompare(a.contribution_date)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aportes');
      } finally {
        setLoading(false);
      }
    }

    loadContributions();
  }, [open, investment, accessToken]);

  const handleDelete = async (contributionId: string) => {
    if (!investment) return;

    setDeletingId(contributionId);
    try {
      await financeApi.deleteFixedIncomeContribution(investment.id, contributionId, accessToken);
      setContributions((prev) => prev.filter((c) => c.id !== contributionId));
      onContributionDeleted?.();
    } catch (err) {
      console.error('Error deleting contribution:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Historico de Aportes
          </DialogTitle>
          {investment && (
            <DialogDescription className="text-sm text-slate-500">
              {investment.name} - Total investido: {formatCurrency(investment.amount_invested)}
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
              <p className="text-sm text-slate-500">Nenhum aporte adicional registrado</p>
              <p className="text-xs text-slate-400">
                O valor inicial ja esta incluido no investimento
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div>
                  <p className="text-xs text-slate-500">Total em aportes</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Aportes</p>
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
                    className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                          <HandCoins className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {contribution.description || 'Aporte'}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(contribution.contribution_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold tabular-nums text-emerald-600">
                          +{formatCurrency(contribution.amount)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                          onClick={() => handleDelete(contribution.id)}
                          disabled={deletingId === contribution.id}
                        >
                          {deletingId === contribution.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 text-center">
                  Aportes adicionais apos o investimento inicial.
                  <br />
                  O valor inicial nao aparece nesta lista.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
