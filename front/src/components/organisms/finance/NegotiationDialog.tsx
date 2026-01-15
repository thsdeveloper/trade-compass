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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  NegotiationFormData,
  NegotiationPaymentMethod,
  FinanceDebtNegotiation,
  DebtWithNegotiation,
} from '@/types/finance';
import { formatCurrency, NEGOTIATION_PAYMENT_METHOD_LABELS } from '@/types/finance';

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NegotiationFormData) => Promise<void>;
  debt: DebtWithNegotiation;
  existingNegotiation?: FinanceDebtNegotiation | null;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function NegotiationDialog({
  open,
  onOpenChange,
  onSave,
  debt,
  existingNegotiation,
}: NegotiationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NegotiationFormData>({
    payment_method: 'A_VISTA',
    total_installments: 1,
    negotiated_value: 0,
    first_payment_date: getCurrentDate(),
  });

  useEffect(() => {
    if (existingNegotiation) {
      setFormData({
        payment_method: existingNegotiation.payment_method,
        total_installments: existingNegotiation.total_installments,
        negotiated_value: existingNegotiation.negotiated_value,
        first_payment_date: existingNegotiation.first_payment_date,
        protocol_number: existingNegotiation.protocol_number || undefined,
        contact_person: existingNegotiation.contact_person || undefined,
        contact_phone: existingNegotiation.contact_phone || undefined,
        contact_email: existingNegotiation.contact_email || undefined,
        notes: existingNegotiation.notes || undefined,
      });
    } else {
      setFormData({
        payment_method: 'A_VISTA',
        total_installments: 1,
        negotiated_value: debt.updated_amount,
        first_payment_date: getCurrentDate(),
      });
    }
  }, [existingNegotiation, debt, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.negotiated_value <= 0) {
      alert('O valor negociado deve ser maior que zero');
      return;
    }

    if (formData.payment_method === 'PARCELADO' && formData.total_installments < 2) {
      alert('O parcelamento deve ter pelo menos 2 parcelas');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving negotiation:', error);
    } finally {
      setLoading(false);
    }
  };

  const installmentValue =
    formData.payment_method === 'PARCELADO' && formData.total_installments > 1
      ? formData.negotiated_value / formData.total_installments
      : formData.negotiated_value;

  const discount = debt.updated_amount - formData.negotiated_value;
  const discountPercentage =
    debt.updated_amount > 0 ? (discount / debt.updated_amount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {existingNegotiation ? 'Editar Negociacao' : 'Nova Negociacao'}
          </DialogTitle>
          <DialogDescription>
            Registre os detalhes da negociacao com {debt.creditor_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info da divida */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Valor atual da divida:</span>
              <span className="font-medium">{formatCurrency(debt.updated_amount)}</span>
            </div>
          </div>

          {/* Metodo de pagamento */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Forma de Pagamento <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              {(['A_VISTA', 'PARCELADO'] as NegotiationPaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      payment_method: method,
                      total_installments: method === 'A_VISTA' ? 1 : formData.total_installments,
                    })
                  }
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                    formData.payment_method === method
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {NEGOTIATION_PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="negotiated_value" className="text-xs font-medium">
                Valor Negociado <span className="text-red-500">*</span>
              </Label>
              <Input
                id="negotiated_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.negotiated_value || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    negotiated_value: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0,00"
                className="h-9 text-[13px]"
              />
            </div>

            {formData.payment_method === 'PARCELADO' && (
              <div className="space-y-2">
                <Label htmlFor="total_installments" className="text-xs font-medium">
                  Numero de Parcelas <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_installments"
                  type="number"
                  min="2"
                  max="120"
                  value={formData.total_installments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_installments: parseInt(e.target.value) || 2,
                    })
                  }
                  className="h-9 text-[13px]"
                />
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
            {formData.payment_method === 'PARCELADO' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Valor da parcela:</span>
                <span className="font-medium">{formatCurrency(installmentValue)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Desconto obtido:</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(discount)} ({discountPercentage.toFixed(1)}%)
                </span>
              </div>
            )}
            {discount < 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Acrescimo:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(Math.abs(discount))}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_payment_date" className="text-xs font-medium">
              Data do Primeiro Pagamento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_payment_date"
              type="date"
              value={formData.first_payment_date}
              onChange={(e) =>
                setFormData({ ...formData, first_payment_date: e.target.value })
              }
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocol_number" className="text-xs font-medium">
              Numero do Protocolo
            </Label>
            <Input
              id="protocol_number"
              value={formData.protocol_number || ''}
              onChange={(e) =>
                setFormData({ ...formData, protocol_number: e.target.value })
              }
              placeholder="Ex: 2024123456"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person" className="text-xs font-medium">
                Nome do Contato
              </Label>
              <Input
                id="contact_person"
                value={formData.contact_person || ''}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="Nome do atendente"
                className="h-9 text-[13px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-xs font-medium">
                Telefone
              </Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, contact_phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-medium">
              Observacoes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes da negociacao..."
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
              {existingNegotiation ? 'Salvar' : 'Registrar Negociacao'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
