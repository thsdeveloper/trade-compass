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
import { Loader2, ArrowDown, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Building2 } from 'lucide-react';
import { BankLogo } from '@/components/molecules/BankSelect';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import { TagInput } from '@/components/molecules/TagInput';
import { GoalSelect } from '@/components/molecules/GoalSelect';
import { useAlert } from '@/components/molecules/ConfirmDialog';
import type {
  FinanceCategory,
  FinanceTag,
  AccountWithBank,
  FinanceCreditCard,
  TransactionFormData,
  TransactionType,
  TransactionWithDetails,
  CategoryFormData,
  TagFormData,
  FinanceCategoryType,
  RecurrenceFormData,
  RecurrenceFrequency,
  TransferFormData,
  GoalSelectItem,
} from '@/types/finance';
import {
  TRANSACTION_TYPE_LABELS,
  RECURRENCE_FREQUENCY_LABELS,
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

// Tipos de categoria para transferencias
const TRANSFER_CATEGORY_TYPES: FinanceCategoryType[] = [
  'INVESTIMENTOS',
  'OUTROS',
];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  onCreateCategory?: (data: CategoryFormData) => Promise<FinanceCategory>;
  onCreateTag?: (data: TagFormData) => Promise<FinanceTag>;
  onCreateRecurrence?: (data: RecurrenceFormData, generateCount?: number) => Promise<void>;
  onCreateTransfer?: (data: TransferFormData) => Promise<void>;
  transaction?: TransactionWithDetails | null;
  categories: FinanceCategory[];
  tags: FinanceTag[];
  accounts: AccountWithBank[];
  creditCards: FinanceCreditCard[];
  goals?: GoalSelectItem[];
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Calcula quantidade de transacoes para 5 anos baseado na frequencia
function calculateFiveYearCount(frequency: RecurrenceFrequency): number {
  const counts: Record<RecurrenceFrequency, number> = {
    DIARIA: 1825,    // 365 * 5
    SEMANAL: 260,    // 52 * 5
    QUINZENAL: 120,  // 24 * 5
    MENSAL: 60,      // 12 * 5
    BIMESTRAL: 30,   // 6 * 5
    TRIMESTRAL: 20,  // 4 * 5
    SEMESTRAL: 10,   // 2 * 5
    ANUAL: 5,        // 1 * 5
  };
  return counts[frequency];
}

// Labels dinamicos para transacoes recorrentes
function getRecurrenceLabel(type: TransactionType): string {
  switch (type) {
    case 'RECEITA':
      return 'Receita fixa (recorrente)';
    case 'TRANSFERENCIA':
      return 'Transferencia fixa (recorrente)';
    default:
      return 'Despesa fixa (recorrente)';
  }
}

function getRecurrenceButtonLabel(type: TransactionType): string {
  switch (type) {
    case 'RECEITA':
      return 'Criar receita fixa';
    case 'TRANSFERENCIA':
      return 'Criar transferencia fixa';
    default:
      return 'Criar despesa fixa';
  }
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSave,
  onCreateCategory,
  onCreateTag,
  onCreateRecurrence,
  onCreateTransfer,
  transaction,
  categories,
  tags,
  accounts,
  creditCards,
  goals = [],
}: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [isRecurrence, setIsRecurrence] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('MENSAL');
  // Transfer states
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  // Alert hook
  const { alert, AlertDialog: AlertDialogComponent } = useAlert();
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'DESPESA',
    category_id: '',
    description: '',
    amount: 0,
    due_date: getCurrentDate(),
    is_installment: false,
    total_installments: 2,
    tag_ids: [],
    goal_id: undefined,
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
        tag_ids: transaction.tags?.map(t => t.id) || [],
        goal_id: transaction.goal_id || undefined,
      });
      setPaymentMethod(transaction.credit_card_id ? 'credit_card' : 'account');
      setIsRecurrence(false);
    } else {
      setFormData({
        type: 'DESPESA',
        category_id: categories.length > 0 ? categories[0].id : '',
        description: '',
        amount: 0,
        due_date: getCurrentDate(),
        is_installment: false,
        total_installments: 2,
        tag_ids: [],
        goal_id: undefined,
      });
      setPaymentMethod('account');
      setIsRecurrence(false);
      setRecurrenceFrequency('MENSAL');
      // Reset transfer states
      setSourceAccountId('');
      setDestinationAccountId('');
    }
  }, [transaction, open, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacao para transferencia
    if (formData.type === 'TRANSFERENCIA') {
      if (!sourceAccountId) {
        alert({ title: 'Campo obrigatorio', description: 'Selecione a conta de origem', variant: 'warning' });
        return;
      }
      if (!destinationAccountId) {
        alert({ title: 'Campo obrigatorio', description: 'Selecione a conta de destino', variant: 'warning' });
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        alert({ title: 'Contas invalidas', description: 'Conta de origem e destino devem ser diferentes', variant: 'warning' });
        return;
      }
    }

    // Validacao: forma de pagamento obrigatoria
    if (formData.type === 'RECEITA' && !formData.account_id) {
      alert({ title: 'Campo obrigatorio', description: 'Selecione a conta de destino para a receita', variant: 'warning' });
      return;
    }

    if (formData.type === 'DESPESA') {
      if (paymentMethod === 'account' && !formData.account_id) {
        alert({ title: 'Campo obrigatorio', description: 'Selecione a conta para a despesa', variant: 'warning' });
        return;
      }
      if (paymentMethod === 'credit_card' && !formData.credit_card_id) {
        alert({ title: 'Campo obrigatorio', description: 'Selecione o cartao para a despesa', variant: 'warning' });
        return;
      }
    }

    setLoading(true);

    try {
      // Se e transferencia, criar via onCreateTransfer
      if (formData.type === 'TRANSFERENCIA' && onCreateTransfer) {
        const transferData: TransferFormData = {
          source_account_id: sourceAccountId,
          destination_account_id: destinationAccountId,
          category_id: formData.category_id,
          description: formData.description,
          amount: formData.amount,
          transfer_date: formData.due_date,
          notes: formData.notes,
          goal_id: formData.goal_id, // Vincular a objetivo se selecionado
        };
        await onCreateTransfer(transferData);
        onOpenChange(false);
        return;
      }

      const data = { ...formData };

      if (formData.type === 'RECEITA') {
        data.credit_card_id = undefined;
      } else if (paymentMethod === 'account') {
        data.credit_card_id = undefined;
      } else {
        data.account_id = undefined;
      }

      // Se e recorrencia, criar via onCreateRecurrence
      if (isRecurrence && onCreateRecurrence) {
        const recurrenceData: RecurrenceFormData = {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          description: data.description,
          amount: data.amount,
          type: data.type,
          frequency: recurrenceFrequency,
          start_date: data.due_date,
        };
        const generateCount = calculateFiveYearCount(recurrenceFrequency);
        await onCreateRecurrence(recurrenceData, generateCount);
      } else {
        await onSave(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!transaction;
  const isPaidTransaction = transaction?.status === 'PAGO';
  const isTransferTransaction = transaction?.transfer_id != null;
  const currentCategoryTypes =
    formData.type === 'RECEITA'
      ? INCOME_CATEGORY_TYPES
      : formData.type === 'TRANSFERENCIA'
        ? TRANSFER_CATEGORY_TYPES
        : EXPENSE_CATEGORY_TYPES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar transacao' : 'Nova transacao'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing
              ? isPaidTransaction
                ? 'Apenas categoria, descricao e notas podem ser editados'
                : 'Atualize os dados da transacao'
              : 'Preencha os dados da transacao'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2">
          {/* Type Toggle - full width */}
          <div className="space-y-1.5 mb-4">
            <Label className="text-xs font-medium text-slate-600">Tipo</Label>
            <div className={cn(
              'flex rounded-md border border-slate-200 p-1 gap-1 bg-slate-50',
              (isPaidTransaction || isTransferTransaction) && 'opacity-60'
            )}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'DESPESA', category_id: '' })}
                disabled={isPaidTransaction || isTransferTransaction}
                className={cn(
                  'flex-1 rounded-[4px] px-3 py-2 text-sm font-medium transition-all duration-150 inline-flex items-center justify-center gap-1.5',
                  formData.type === 'DESPESA'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50/80',
                  (isPaidTransaction || isTransferTransaction) && 'cursor-not-allowed'
                )}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                {TRANSACTION_TYPE_LABELS.DESPESA}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'RECEITA', category_id: '' })}
                disabled={isPaidTransaction || isTransferTransaction}
                className={cn(
                  'flex-1 rounded-[4px] px-3 py-2 text-sm font-medium transition-all duration-150 inline-flex items-center justify-center gap-1.5',
                  formData.type === 'RECEITA'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/80',
                  (isPaidTransaction || isTransferTransaction) && 'cursor-not-allowed'
                )}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                {TRANSACTION_TYPE_LABELS.RECEITA}
              </button>
              {onCreateTransfer && !isEditing && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'TRANSFERENCIA', category_id: '' })}
                  disabled={isPaidTransaction || isEditing}
                  className={cn(
                    'flex-1 rounded-[4px] px-3 py-2 text-sm font-medium transition-all duration-150 inline-flex items-center justify-center gap-1.5',
                    formData.type === 'TRANSFERENCIA'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                    (isPaidTransaction || isEditing) && 'cursor-not-allowed'
                  )}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {TRANSACTION_TYPE_LABELS.TRANSFERENCIA}
                </button>
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
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
                    disabled={isPaidTransaction}
                    className={cn('h-9 text-sm', isPaidTransaction && 'opacity-60 cursor-not-allowed')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="due_date" className="text-xs font-medium text-slate-600">
                    Vencimento
                  </Label>
                  <DatePicker
                    id="due_date"
                    value={formData.due_date}
                    onChange={(value) =>
                      setFormData({ ...formData, due_date: value })
                    }
                    disabled={isPaidTransaction}
                    className={cn('h-9 text-sm', isPaidTransaction && 'opacity-60 cursor-not-allowed')}
                  />
                </div>
              </div>

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

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Tags
                </Label>
                <TagInput
                  value={formData.tag_ids || []}
                  onChange={(tag_ids) => setFormData({ ...formData, tag_ids })}
                  tags={tags}
                  onCreateTag={onCreateTag}
                  placeholder="Adicionar tags..."
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Transfer Accounts - only shown for TRANSFERENCIA type */}
              {formData.type === 'TRANSFERENCIA' && (
                <div className="space-y-3 rounded-md border border-blue-100 bg-blue-50/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <ArrowLeftRight className="h-4 w-4" />
                    Transferencia entre contas
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">
                      Conta de origem <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={sourceAccountId}
                      onValueChange={setSourceAccountId}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="De onde sai o dinheiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter(acc => acc.id !== destinationAccountId)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                {acc.bank?.logo_url ? (
                                  <img src={acc.bank.logo_url} alt={acc.bank.name} className="h-5 w-5 object-contain" />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: acc.color }}>
                                    <Building2 className="h-3 w-3 text-white" />
                                  </div>
                                )}
                                <span className="flex-1">{acc.name}</span>
                                <span className="text-xs text-slate-400">
                                  {formatCurrency(acc.current_balance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center">
                    <ArrowDown className="h-4 w-4 text-blue-400" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">
                      Conta de destino <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={destinationAccountId}
                      onValueChange={setDestinationAccountId}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Para onde vai o dinheiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter(acc => acc.id !== sourceAccountId)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                {acc.bank?.logo_url ? (
                                  <img src={acc.bank.logo_url} alt={acc.bank.name} className="h-5 w-5 object-contain" />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: acc.color }}>
                                    <Building2 className="h-3 w-3 text-white" />
                                  </div>
                                )}
                                <span className="flex-1">{acc.name}</span>
                                <span className="text-xs text-slate-400">
                                  {formatCurrency(acc.current_balance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Goal Selection - for transfers */}
                  <div className="space-y-1.5 pt-2 border-t border-blue-100">
                    <Label className="text-xs font-medium text-slate-600">
                      Vincular a objetivo (opcional)
                    </Label>
                    {goals.length > 0 ? (
                      <GoalSelect
                        value={formData.goal_id}
                        onChange={(value) => setFormData({ ...formData, goal_id: value })}
                        goals={goals}
                      />
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1">
                        Nenhum objetivo cadastrado.{' '}
                        <a href="/financas/objetivos" className="text-blue-500 hover:underline">
                          Criar objetivo
                        </a>
                      </p>
                    )}
                    {goals.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Transfira para uma conta de poupanca vinculada a um objetivo
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method - for income, account is required */}
              {formData.type === 'RECEITA' && (
                <div className={cn('space-y-2', isPaidTransaction && 'opacity-60')}>
                  <Label className="text-xs font-medium text-slate-600">
                    Conta de destino <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.account_id || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, account_id: value || undefined })
                    }
                    disabled={isPaidTransaction}
                  >
                    <SelectTrigger className={cn('h-9 text-sm', isPaidTransaction && 'cursor-not-allowed')}>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            {acc.bank?.logo_url ? (
                              <img src={acc.bank.logo_url} alt={acc.bank.name} className="h-5 w-5 object-contain" />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: acc.color }}>
                                <Building2 className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <span className="flex-1">{acc.name}</span>
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
                <div className={cn('space-y-2', isPaidTransaction && 'opacity-60')}>
                  <Label className="text-xs font-medium text-slate-600">
                    Forma de pagamento <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-3">
                    <label className={cn('flex items-center gap-2', isPaidTransaction ? 'cursor-not-allowed' : 'cursor-pointer')}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'account'}
                        onChange={() => setPaymentMethod('account')}
                        disabled={isPaidTransaction}
                        className="h-3.5 w-3.5 accent-slate-900"
                      />
                      <span className="text-sm text-slate-600">Conta</span>
                    </label>
                    <label className={cn('flex items-center gap-2', isPaidTransaction ? 'cursor-not-allowed' : 'cursor-pointer')}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'credit_card'}
                        onChange={() => setPaymentMethod('credit_card')}
                        disabled={isPaidTransaction}
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
                      disabled={isPaidTransaction}
                    >
                      <SelectTrigger className={cn('h-9 text-sm', isPaidTransaction && 'cursor-not-allowed')}>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              {acc.bank?.logo_url ? (
                                <img src={acc.bank.logo_url} alt={acc.bank.name} className="h-5 w-5 object-contain" />
                              ) : (
                                <div className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: acc.color }}>
                                  <Building2 className="h-3 w-3 text-white" />
                                </div>
                              )}
                              <span className="flex-1">{acc.name}</span>
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
                      disabled={isPaidTransaction}
                    >
                      <SelectTrigger className={cn('h-9 text-sm', isPaidTransaction && 'cursor-not-allowed')}>
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

              {/* Installment Option - only for new transactions and not recurrence */}
              {!isEditing && formData.type === 'DESPESA' && !isRecurrence && (
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

              {/* Recurrence Option - only for new transactions and when onCreateRecurrence is provided */}
              {!isEditing && onCreateRecurrence && !formData.is_installment && (
                <div className="rounded-md border border-slate-100 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isRecurrence}
                      onChange={(e) => setIsRecurrence(e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-slate-900"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {getRecurrenceLabel(formData.type)}
                    </span>
                  </label>
                  <p className="mt-1 ml-5 text-xs text-slate-400">
                    Repete automaticamente
                  </p>

                  {isRecurrence && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Frequencia</Label>
                        <Select
                          value={recurrenceFrequency}
                          onValueChange={(value) => setRecurrenceFrequency(value as RecurrenceFrequency)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(RECURRENCE_FREQUENCY_LABELS) as [RecurrenceFrequency, string][]).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value} className="text-sm">
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-slate-400">
                        {calculateFiveYearCount(recurrenceFrequency)} transacoes serao criadas (5 anos)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 mt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9"
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
                    (paymentMethod === 'credit_card' && !formData.credit_card_id))) ||
                (formData.type === 'TRANSFERENCIA' &&
                  (!sourceAccountId || !destinationAccountId))
              }
              className={cn(
                'h-9 transition-colors duration-150',
                formData.type === 'TRANSFERENCIA'
                  ? 'bg-slate-700 hover:bg-slate-800'
                  : formData.type === 'RECEITA'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEditing
                ? 'Salvar'
                : formData.type === 'TRANSFERENCIA'
                  ? 'Transferir'
                  : isRecurrence
                    ? getRecurrenceButtonLabel(formData.type)
                    : formData.is_installment
                      ? 'Criar parcelas'
                      : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {AlertDialogComponent}
    </Dialog>
  );
}
