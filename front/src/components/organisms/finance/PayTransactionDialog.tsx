'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, Clock, Landmark, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format, parse } from 'date-fns';
import type {
  TransactionWithDetails,
  AccountWithBank,
  PayTransactionData,
} from '@/types/finance';

interface PayTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionWithDetails | null;
  accounts: AccountWithBank[];
  onConfirm: (data: PayTransactionData) => Promise<void>;
}

type DateSelection = 'today' | 'yesterday' | 'custom';

const themeConfig = {
  RECEITA: {
    title: 'Deseja efetivar esta receita?',
    subtitle: 'Ao efetivar essa receita sera adicionado o valor na Conta.',
    amountColor: 'text-emerald-600',
    amountBorder: 'border-emerald-200 focus-within:border-emerald-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    buttonOutline: 'border-emerald-600 text-emerald-600 hover:bg-emerald-50',
    chipActive: 'bg-emerald-600 text-white border-emerald-600',
    chipInactive: 'border-slate-300 text-slate-600 hover:border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    confirmLabel: 'RECEBER',
  },
  DESPESA: {
    title: 'Deseja efetivar esta despesa?',
    subtitle: 'Ao efetivar essa despesa sera descontado o valor na Conta.',
    amountColor: 'text-rose-600',
    amountBorder: 'border-rose-200 focus-within:border-rose-400',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    buttonOutline: 'border-rose-600 text-rose-600 hover:bg-rose-50',
    chipActive: 'bg-rose-600 text-white border-rose-600',
    chipInactive: 'border-slate-300 text-slate-600 hover:border-rose-400',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    confirmLabel: 'PAGAR',
  },
};

function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseCurrencyInput(value: string): number {
  // Remove tudo exceto digitos e virgula
  const cleaned = value.replace(/[^\d,]/g, '');
  // Substitui virgula por ponto
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function getDateFromSelection(selection: DateSelection, customDate: string): string {
  const today = new Date();
  switch (selection) {
    case 'today':
      return today.toISOString().split('T')[0];
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    case 'custom':
      return customDate;
  }
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PayTransactionDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
  onConfirm,
}: PayTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [dateSelection, setDateSelection] = useState<DateSelection>('today');
  const [customDate, setCustomDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Reset state when transaction changes
  useEffect(() => {
    if (transaction && open) {
      setAmountInput(formatCurrencyInput(transaction.amount));
      setDateSelection('today');
      setCustomDate(new Date().toISOString().split('T')[0]);
      setSelectedAccountId(transaction.account_id || '');
    }
  }, [transaction, open]);

  const theme = transaction?.type === 'RECEITA' ? themeConfig.RECEITA : themeConfig.DESPESA;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permite apenas digitos, virgula e ponto
    const cleaned = value.replace(/[^\d.,]/g, '');
    setAmountInput(cleaned);
  };

  const handleAmountBlur = () => {
    const parsed = parseCurrencyInput(amountInput);
    if (parsed > 0) {
      setAmountInput(formatCurrencyInput(parsed));
    }
  };

  const handleConfirm = useCallback(async () => {
    if (!transaction) return;

    const paidAmount = parseCurrencyInput(amountInput);
    if (paidAmount <= 0) return;

    const paymentDate = getDateFromSelection(dateSelection, customDate);

    setLoading(true);
    try {
      await onConfirm({
        paid_amount: paidAmount,
        payment_date: paymentDate,
        account_id: selectedAccountId !== transaction.account_id ? selectedAccountId : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  }, [transaction, amountInput, dateSelection, customDate, selectedAccountId, onConfirm, onOpenChange]);

  const handleDateChipClick = (selection: DateSelection) => {
    if (selection === 'custom') {
      setDatePickerOpen(true);
    } else {
      setDateSelection(selection);
      setDatePickerOpen(false);
    }
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(format(date, 'yyyy-MM-dd'));
      setDateSelection('custom');
      setDatePickerOpen(false);
    }
  };

  const customDateParsed = customDate ? parse(customDate, 'yyyy-MM-dd', new Date()) : undefined;

  if (!transaction) return null;

  const paidAmount = parseCurrencyInput(amountInput);
  const isValid = paidAmount > 0 && selectedAccountId;

  // Filtrar apenas contas ativas
  const activeAccounts = accounts.filter(acc => acc.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {theme.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {theme.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Valor */}
          <div className="flex items-center gap-3">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', theme.iconBg)}>
              <Calendar className={cn('h-4 w-4', theme.iconColor)} />
            </div>
            <div className={cn('flex flex-1 items-center rounded-lg border px-3 py-2', theme.amountBorder)}>
              <span className={cn('mr-1 text-base font-medium', theme.amountColor)}>R$</span>
              <Input
                value={amountInput}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                className={cn(
                  'flex-1 border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0',
                  theme.amountColor
                )}
                placeholder="0,00"
              />
              <span className="ml-2 text-xs text-slate-400">BRL</span>
            </div>
          </div>

          {/* Data */}
          <div className="flex items-center gap-3">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', theme.iconBg)}>
              <Clock className={cn('h-4 w-4', theme.iconColor)} />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => handleDateChipClick('today')}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  dateSelection === 'today' ? theme.chipActive : theme.chipInactive
                )}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleDateChipClick('yesterday')}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  dateSelection === 'yesterday' ? theme.chipActive : theme.chipInactive
                )}
              >
                Ontem
              </button>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                      dateSelection === 'custom' ? theme.chipActive : theme.chipInactive
                    )}
                  >
                    {dateSelection === 'custom' ? formatDateForDisplay(customDate) : 'Outros...'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customDateParsed}
                    onSelect={handleCustomDateSelect}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Conta */}
          <div className="flex items-center gap-3">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', theme.iconBg)}>
              <Landmark className={cn('h-4 w-4', theme.iconColor)} />
            </div>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      {account.bank?.logo_url ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-100">
                          <img
                            src={account.bank.logo_url}
                            alt={account.bank.name}
                            className="h-4 w-4 object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-lg"
                          style={{ backgroundColor: account.color }}
                        >
                          <Building2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span>{account.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className={cn('h-10 px-6 font-semibold uppercase', theme.buttonOutline)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !isValid}
            className={cn('h-10 px-6 font-semibold uppercase', theme.buttonBg)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {theme.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
