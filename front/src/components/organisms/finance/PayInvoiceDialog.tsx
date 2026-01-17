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
import { Loader2, CreditCard, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CreditCardInvoice,
  AccountWithBank,
  PayInvoiceFormData,
  InvoicePaymentType,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface PayInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: CreditCardInvoice | null;
  accounts: AccountWithBank[];
  onPayment: (data: PayInvoiceFormData) => Promise<void>;
}

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  accounts,
  onPayment,
}: PayInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<InvoicePaymentType>('TOTAL');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Calcular valor minimo (15% da fatura)
  const minimumAmount = invoice ? invoice.total * 0.15 : 0;

  useEffect(() => {
    if (invoice) {
      if (paymentType === 'TOTAL') {
        setAmount(invoice.total);
      } else if (paymentType === 'MINIMO') {
        setAmount(minimumAmount);
      }
    }
  }, [paymentType, invoice, minimumAmount]);

  useEffect(() => {
    if (open && invoice) {
      setPaymentType('TOTAL');
      setAmount(invoice.total);
      setAccountId('');
      setNotes('');
    }
  }, [open, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      alert('Selecione a conta para pagamento');
      return;
    }

    if (!invoice) return;

    setLoading(true);
    try {
      await onPayment({
        account_id: accountId,
        amount,
        invoice_month: invoice.month,
        payment_type: paymentType,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error paying invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const hasInsufficientBalance = selectedAccount && selectedAccount.current_balance < amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="h-4 w-4" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {invoice.credit_card.name} - Fatura de {invoice.month}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Resumo da Fatura */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Total da fatura:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Pagamento minimo (15%):</span>
              <span>{formatCurrency(minimumAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Vencimento:</span>
              <span>{invoice.due_date.split('-').reverse().join('/')}</span>
            </div>
          </div>

          {/* Tipo de Pagamento */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              Tipo de pagamento
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('TOTAL')}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  paymentType === 'TOTAL'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                Total
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('PARCIAL')}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  paymentType === 'PARCIAL'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                Parcial
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('MINIMO')}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  paymentType === 'MINIMO'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                Minimo
              </button>
            </div>
          </div>

          {/* Valor do Pagamento */}
          {paymentType === 'PARCIAL' && (
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium text-slate-600">
                Valor do pagamento (R$)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={minimumAmount}
                max={invoice.total}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
              <p className="text-xs text-slate-400">
                Minimo: {formatCurrency(minimumAmount)} | Maximo: {formatCurrency(invoice.total)}
              </p>
            </div>
          )}

          {/* Valor fixo para total e minimo */}
          {paymentType !== 'PARCIAL' && (
            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Valor a pagar:</span>
                <span className="text-lg font-semibold text-slate-900">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          )}

          {/* Conta de Origem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Pagar com a conta <span className="text-red-500">*</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-sm">
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
                      <span className="text-xs text-slate-400">
                        ({formatCurrency(acc.current_balance)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasInsufficientBalance && (
              <p className="text-xs text-amber-600">
                Saldo insuficiente. O saldo ficara negativo apos o pagamento.
              </p>
            )}
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-slate-600">
              Observacoes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={loading || !accountId || amount <= 0}
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Pagar {formatCurrency(amount)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
