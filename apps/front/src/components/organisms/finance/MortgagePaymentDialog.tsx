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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type { MortgageInstallment, PayInstallmentFormData } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MortgagePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PayInstallmentFormData) => Promise<void>;
  installment: MortgageInstallment | null;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function MortgagePaymentDialog({
  open,
  onOpenChange,
  onSave,
  installment,
}: MortgagePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PayInstallmentFormData>({
    paid_amount: 0,
    payment_date: getCurrentDate(),
  });

  useEffect(() => {
    if (installment) {
      setFormData({
        paid_amount: installment.total_amount,
        payment_date: getCurrentDate(),
      });
    }
  }, [installment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paid_amount || formData.paid_amount <= 0) {
      alert('Informe o valor pago');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error paying installment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!installment) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Parcela {installment.installment_number} - Vencimento:{' '}
            {formatDate(installment.due_date)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amortizacao:</span>
              <span>{formatCurrency(installment.amortization_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Juros:</span>
              <span>{formatCurrency(installment.interest_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seguros:</span>
              <span>
                {formatCurrency(installment.mip_insurance + installment.dfi_insurance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tarifa:</span>
              <span>{formatCurrency(installment.admin_fee)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total:</span>
              <span>{formatCurrency(installment.total_amount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid_amount" className="text-xs font-medium">
              Valor Pago <span className="text-red-500">*</span>
            </Label>
            <CurrencyInput
              id="paid_amount"
              value={formData.paid_amount || 0}
              onChange={(value) => setFormData({ ...formData, paid_amount: value })}
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date" className="text-xs font-medium">
              Data do Pagamento <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              id="payment_date"
              value={formData.payment_date || getCurrentDate()}
              onChange={(value) => setFormData({ ...formData, payment_date: value })}
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-medium">
              Observacoes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informacoes adicionais..."
              className="min-h-[60px] text-[13px]"
            />
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
