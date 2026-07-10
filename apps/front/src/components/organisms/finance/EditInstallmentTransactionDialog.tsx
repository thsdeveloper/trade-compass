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
import { Pencil } from 'lucide-react';
import type { TransactionWithDetails } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

export type EditInstallmentOption = 'only_this' | 'this_and_future' | 'all';

interface EditInstallmentTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (option: EditInstallmentOption) => void;
  transaction: TransactionWithDetails;
}

export function EditInstallmentTransactionDialog({
  open,
  onOpenChange,
  onConfirm,
  transaction,
}: EditInstallmentTransactionDialogProps) {
  const [selectedOption, setSelectedOption] = useState<EditInstallmentOption>('only_this');

  const handleConfirm = () => {
    onConfirm(selectedOption);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const installmentInfo = transaction.installment_number && transaction.total_installments
    ? `Parcela ${transaction.installment_number}/${transaction.total_installments}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Pencil className="h-5 w-5 text-blue-500" />
            Editar transacao parcelada
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Esta transacao faz parte de um parcelamento. Como deseja proceder?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Transaction Info */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="font-medium text-sm">{transaction.description}</div>
            <div className="text-xs text-slate-500 mt-1">
              {installmentInfo} - Vencimento: {formatDate(transaction.due_date)} - {formatCurrency(transaction.amount)}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              O que deseja editar?
            </Label>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="editOption"
                  checked={selectedOption === 'only_this'}
                  onChange={() => setSelectedOption('only_this')}
                  className="mt-0.5 h-4 w-4 accent-slate-900"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Apenas esta parcela</div>
                  <div className="text-xs text-slate-500">
                    As outras parcelas nao serao alteradas
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="editOption"
                  checked={selectedOption === 'this_and_future'}
                  onChange={() => setSelectedOption('this_and_future')}
                  className="mt-0.5 h-4 w-4 accent-slate-900"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Esta e todas as futuras pendentes</div>
                  <div className="text-xs text-slate-500">
                    Edita esta e as futuras pendentes (pagas nao sao afetadas)
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-200 p-3 hover:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="editOption"
                  checked={selectedOption === 'all'}
                  onChange={() => setSelectedOption('all')}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-blue-700">Todas as parcelas pendentes</div>
                  <div className="text-xs text-blue-500">
                    Edita todas as pendentes deste parcelamento (pagas nao sao afetadas)
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
            className="h-8"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="h-8 bg-slate-900 hover:bg-slate-800"
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
