'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { TransactionWithDetails } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

export type DeleteRecurrenceOption = 'only_this' | 'this_and_future' | 'all';

interface DeleteRecurrenceTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (option: DeleteRecurrenceOption) => Promise<void>;
  transaction: TransactionWithDetails;
}

export function DeleteRecurrenceTransactionDialog({
  open,
  onOpenChange,
  onConfirm,
  transaction,
}: DeleteRecurrenceTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DeleteRecurrenceOption>('only_this');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(selectedOption);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Excluir transacao recorrente
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Esta transacao faz parte de uma despesa fixa. Como deseja proceder?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Transaction Info */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="font-medium text-sm">{transaction.description}</div>
            <div className="text-xs text-slate-500 mt-1">
              Vencimento: {formatDate(transaction.due_date)} - {formatCurrency(transaction.amount)}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              O que deseja excluir?
            </Label>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={selectedOption === 'only_this'}
                  onChange={() => setSelectedOption('only_this')}
                  className="mt-0.5 h-4 w-4 accent-slate-900"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Apenas esta transacao</div>
                  <div className="text-xs text-slate-500">
                    As outras transacoes desta despesa fixa permanecem
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={selectedOption === 'this_and_future'}
                  onChange={() => setSelectedOption('this_and_future')}
                  className="mt-0.5 h-4 w-4 accent-slate-900"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Esta e todas as futuras</div>
                  <div className="text-xs text-slate-500">
                    Exclui esta e as futuras pendentes (pagas nao sao afetadas)
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-200 p-3 hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={selectedOption === 'all'}
                  onChange={() => setSelectedOption('all')}
                  className="mt-0.5 h-4 w-4 accent-red-600"
                />
                <div>
                  <div className="text-sm font-medium text-red-700">Todas as transacoes</div>
                  <div className="text-xs text-red-500">
                    Exclui pendentes, desativa a despesa fixa (pagas nao sao afetadas)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-8"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={`h-8 ${
              selectedOption === 'all'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
