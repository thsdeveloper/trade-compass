'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, Receipt } from 'lucide-react';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import type {
  GenerateTransactionsFormData,
  FinanceDebtNegotiation,
  DebtWithNegotiation,
  FinanceCategory,
  FinanceAccount,
  CategoryFormData,
} from '@/types/finance';
import { formatCurrency, NEGOTIATION_PAYMENT_METHOD_LABELS } from '@/types/finance';

interface GenerateTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: GenerateTransactionsFormData) => Promise<void>;
  onCreateCategory?: (data: CategoryFormData) => Promise<FinanceCategory>;
  debt: DebtWithNegotiation;
  negotiation: FinanceDebtNegotiation;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
}

export function GenerateTransactionsDialog({
  open,
  onOpenChange,
  onGenerate,
  onCreateCategory,
  debt,
  negotiation,
  categories,
  accounts,
}: GenerateTransactionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<GenerateTransactionsFormData>({
    category_id: '',
    account_id: '',
  });

  useEffect(() => {
    if (open) {
      // Tentar encontrar categoria de divida como default, senao usa a primeira
      const debtCategory = categories.find((c) => c.type === 'DIVIDA');
      const defaultCategory = debtCategory || categories[0];

      setFormData({
        category_id: defaultCategory?.id || '',
        account_id: accounts[0]?.id || '',
      });
    }
  }, [open, categories, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_id) {
      alert('Selecione uma categoria');
      return;
    }

    if (!formData.account_id) {
      alert('Selecione uma conta para debito');
      return;
    }

    setLoading(true);

    try {
      await onGenerate(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar preview das parcelas
  const generatePreview = () => {
    const items = [];
    const firstDate = new Date(negotiation.first_payment_date);

    for (let i = 0; i < Math.min(negotiation.total_installments, 6); i++) {
      const dueDate = new Date(firstDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      items.push({
        number: i + 1,
        date: dueDate.toLocaleDateString('pt-BR'),
        value: negotiation.installment_value,
      });
    }

    return items;
  };

  const previewItems = generatePreview();
  const hasMoreItems = negotiation.total_installments > 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Lancar nas Transacoes</DialogTitle>
          <DialogDescription>
            Gere transacoes a partir da negociacao para acompanhar os pagamentos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info da negociacao */}
          <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Credor:</span>
              <span className="font-medium">{debt.creditor_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Forma de pagamento:</span>
              <span className="font-medium">
                {NEGOTIATION_PAYMENT_METHOD_LABELS[negotiation.payment_method]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Valor negociado:</span>
              <span className="font-medium">
                {formatCurrency(negotiation.negotiated_value)}
              </span>
            </div>
            {negotiation.total_installments > 1 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Parcelas:</span>
                  <span className="font-medium">{negotiation.total_installments}x</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Valor da parcela:</span>
                  <span className="font-medium">
                    {formatCurrency(negotiation.installment_value)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Alerta se ja gerou transacoes */}
          {negotiation.transactions_generated && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div className="text-sm text-amber-800">
                As transacoes ja foram geradas para esta negociacao.
              </div>
            </div>
          )}

          {/* Selecao de categoria e conta */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-medium">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <CategorySelect
              value={formData.category_id}
              onChange={(value) => setFormData({ ...formData, category_id: value })}
              categories={categories}
              onCreateCategory={onCreateCategory}
              placeholder="Selecione uma categoria"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account" className="text-xs font-medium">
              Conta para Debito <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview das transacoes */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Preview das Transacoes</Label>
            <div className="rounded-lg border divide-y max-h-[200px] overflow-y-auto">
              {previewItems.map((item) => (
                <div
                  key={item.number}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      Parcela {item.number}/{negotiation.total_installments}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">{item.date}</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                </div>
              ))}
              {hasMoreItems && (
                <div className="px-3 py-2 text-sm text-center text-slate-500">
                  + {negotiation.total_installments - 6} parcelas...
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || negotiation.transactions_generated}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar {negotiation.total_installments} Transacao
              {negotiation.total_installments > 1 ? 'es' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
