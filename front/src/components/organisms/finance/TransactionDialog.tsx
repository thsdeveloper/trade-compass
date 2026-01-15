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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import type {
  FinanceCategory,
  FinanceAccount,
  FinanceCreditCard,
  TransactionFormData,
  TransactionType,
  TransactionWithDetails,
  CategoryFormData,
  FinanceCategoryType,
} from '@/types/finance';
import {
  TRANSACTION_TYPE_LABELS,
  formatCurrency,
} from '@/types/finance';

// Tipos de categoria para despesas
const EXPENSE_CATEGORY_TYPES: FinanceCategoryType[] = [
  'MORADIA',
  'ALIMENTACAO',
  'TRANSPORTE',
  'SAUDE',
  'LAZER',
  'EDUCACAO',
  'VESTUARIO',
  'SERVICOS',
  'DIVIDA',
  'OUTROS',
];

// Tipos de categoria para receitas
const INCOME_CATEGORY_TYPES: FinanceCategoryType[] = [
  'SALARIO',
  'FREELANCE',
  'INVESTIMENTOS',
  'OUTROS',
];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  onCreateCategory?: (data: CategoryFormData) => Promise<FinanceCategory>;
  transaction?: TransactionWithDetails | null;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  creditCards: FinanceCreditCard[];
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSave,
  onCreateCategory,
  transaction,
  categories,
  accounts,
  creditCards,
}: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'DESPESA',
    category_id: '',
    description: '',
    amount: 0,
    due_date: getCurrentDate(),
    is_installment: false,
    total_installments: 2,
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        category_id: transaction.category_id,
        account_id: transaction.account_id || undefined,
        credit_card_id: transaction.credit_card_id || undefined,
        description: transaction.description,
        amount: transaction.amount,
        due_date: transaction.due_date,
        notes: transaction.notes || undefined,
        is_installment: false,
        total_installments: 2,
      });
      setPaymentMethod(transaction.credit_card_id ? 'credit_card' : 'account');
    } else {
      setFormData({
        type: 'DESPESA',
        category_id: categories.length > 0 ? categories[0].id : '',
        description: '',
        amount: 0,
        due_date: getCurrentDate(),
        is_installment: false,
        total_installments: 2,
      });
      setPaymentMethod('account');
    }
  }, [transaction, open, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacao: forma de pagamento obrigatoria
    if (formData.type === 'RECEITA' && !formData.account_id) {
      alert('Selecione a conta de destino para a receita');
      return;
    }

    if (formData.type === 'DESPESA') {
      if (paymentMethod === 'account' && !formData.account_id) {
        alert('Selecione a conta para a despesa');
        return;
      }
      if (paymentMethod === 'credit_card' && !formData.credit_card_id) {
        alert('Selecione o cartao para a despesa');
        return;
      }
    }

    setLoading(true);

    try {
      const data = { ...formData };

      if (formData.type === 'RECEITA') {
        data.credit_card_id = undefined;
      } else if (paymentMethod === 'account') {
        data.credit_card_id = undefined;
      } else {
        data.account_id = undefined;
      }

      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!transaction;
  const currentCategoryTypes =
    formData.type === 'RECEITA' ? INCOME_CATEGORY_TYPES : EXPENSE_CATEGORY_TYPES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar transacao' : 'Nova transacao'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing
              ? 'Atualize os dados da transacao'
              : 'Preencha os dados da transacao'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Type Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Tipo</Label>
            <div className="flex rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'DESPESA', category_id: '' })}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  formData.type === 'DESPESA'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {TRANSACTION_TYPE_LABELS.DESPESA}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'RECEITA', category_id: '' })}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  formData.type === 'RECEITA'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {TRANSACTION_TYPE_LABELS.RECEITA}
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Categoria</Label>
            <CategorySelect
              value={formData.category_id}
              onChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
              categories={categories}
              onCreateCategory={onCreateCategory}
              filterTypes={currentCategoryTypes}
              placeholder="Selecione..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium text-slate-600">
              Descricao
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Supermercado, Aluguel, Salario..."
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Amount and Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium text-slate-600">
                Valor (R$)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date" className="text-xs font-medium text-slate-600">
                Vencimento
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Payment Method - for income, account is required */}
          {formData.type === 'RECEITA' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                Conta de destino <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.account_id || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, account_id: value || undefined })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span>{acc.name}</span>
                        <span className="text-xs text-slate-400">{formatCurrency(acc.current_balance)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Method - for expenses, account OR credit card is required */}
          {formData.type === 'DESPESA' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                Forma de pagamento <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'account'}
                    onChange={() => setPaymentMethod('account')}
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                  <span className="text-sm text-slate-600">Conta</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'credit_card'}
                    onChange={() => setPaymentMethod('credit_card')}
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                  <span className="text-sm text-slate-600">Cartao</span>
                </label>
              </div>

              {paymentMethod === 'account' && (
                <Select
                  value={formData.account_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_id: value || undefined })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span>{acc.name}</span>
                          <span className="text-xs text-slate-400">{formatCurrency(acc.current_balance)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {paymentMethod === 'credit_card' && (
                <Select
                  value={formData.credit_card_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, credit_card_id: value || undefined })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione o cartao" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id} className="text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span>{card.name} ({card.brand})</span>
                          <span className="text-xs text-slate-400">
                            Limite: {formatCurrency(card.available_limit)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Installment Option - only for new transactions */}
          {!isEditing && formData.type === 'DESPESA' && (
            <div className="rounded-md border border-slate-100 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_installment}
                  onChange={(e) =>
                    setFormData({ ...formData, is_installment: e.target.checked })
                  }
                  className="h-3.5 w-3.5 rounded accent-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">
                  Parcelar esta transacao
                </span>
              </label>

              {formData.is_installment && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="total_installments" className="text-xs font-medium text-slate-600">
                    Numero de parcelas
                  </Label>
                  <Input
                    id="total_installments"
                    type="number"
                    min="2"
                    max="72"
                    value={formData.total_installments || 2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_installments: parseInt(e.target.value) || 2,
                      })
                    }
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-slate-400">
                    Valor por parcela:{' '}
                    <span className="font-medium tabular-nums text-slate-600">
                      {formatCurrency(formData.amount / (formData.total_installments || 2))}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-slate-600">
              Observacoes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Observacoes adicionais..."
              rows={2}
              className="text-sm"
            />
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
              type="submit"
              size="sm"
              disabled={
                loading ||
                !formData.category_id ||
                (formData.type === 'RECEITA' && !formData.account_id) ||
                (formData.type === 'DESPESA' &&
                  ((paymentMethod === 'account' && !formData.account_id) ||
                    (paymentMethod === 'credit_card' && !formData.credit_card_id)))
              }
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Salvar' : formData.is_installment ? 'Criar parcelas' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
