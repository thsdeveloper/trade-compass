'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Calculator, TrendingDown, Clock, PiggyBank, Info } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  ExtraPaymentFormData,
  SimulateExtraPaymentFormData,
  ExtraPaymentSimulation,
  MortgageExtraPaymentType,
} from '@/types/finance';
import { formatCurrency, MORTGAGE_EXTRA_PAYMENT_TYPE_LABELS } from '@/types/finance';

interface MortgageExtraPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ExtraPaymentFormData) => Promise<void>;
  mortgage: MortgageWithProgress | null;
  accessToken: string;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function MortgageExtraPaymentDialog({
  open,
  onOpenChange,
  onSave,
  mortgage,
  accessToken,
}: MortgageExtraPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<ExtraPaymentSimulation | null>(null);
  const [formData, setFormData] = useState<ExtraPaymentFormData>({
    payment_date: getCurrentDate(),
    amount: 0,
    payment_type: 'REDUCE_TERM',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        payment_date: getCurrentDate(),
        amount: 0,
        payment_type: 'REDUCE_TERM',
      });
      setSimulation(null);
    }
  }, [open]);

  const handleSimulate = useCallback(async () => {
    if (!mortgage || !formData.amount || formData.amount <= 0) return;

    setSimulating(true);
    try {
      const data: SimulateExtraPaymentFormData = {
        amount: formData.amount,
        payment_type: formData.payment_type,
      };
      const result = await financeApi.simulateMortgageExtraPayment(
        mortgage.id,
        data,
        accessToken
      );
      setSimulation(result);
    } catch (error) {
      console.error('Error simulating:', error);
    } finally {
      setSimulating(false);
    }
  }, [mortgage, formData.amount, formData.payment_type, accessToken]);

  // Auto-simulate when amount or type changes
  useEffect(() => {
    if (formData.amount > 0 && mortgage) {
      const timer = setTimeout(() => {
        handleSimulate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.amount, formData.payment_type, handleSimulate, mortgage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      alert('Informe o valor da amortizacao');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving extra payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mortgage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Amortizacao Extraordinaria</DialogTitle>
          <DialogDescription>
            Saldo atual: {formatCurrency(mortgage.current_balance || 0)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Tipo de Amortizacao <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.payment_type}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_type: value as MortgageExtraPaymentType })
              }
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem
                  value="REDUCE_TERM"
                  id="reduce_term"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="reduce_term"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Clock className="mb-2 h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Reduzir Prazo</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Mantem parcela, reduz meses
                  </span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem
                  value="REDUCE_INSTALLMENT"
                  id="reduce_installment"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="reduce_installment"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <TrendingDown className="mb-2 h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">Reduzir Parcela</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Mantem prazo, reduz valor
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-medium">
                Valor <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                id="amount"
                value={formData.amount || 0}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date" className="text-xs font-medium">
                Data <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="payment_date"
                value={formData.payment_date || getCurrentDate()}
                onChange={(value) => setFormData({ ...formData, payment_date: value })}
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          {/* Simulation Results */}
          {simulating && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando simulacao...
            </div>
          )}

          {simulation && !simulating && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4 text-primary" />
                Resultado da Simulacao
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground mb-1">Saldo Devedor</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground line-through mr-2">
                      {formatCurrency(simulation.current_balance)}
                    </span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(simulation.new_balance)}
                    </span>
                  </p>
                </div>

                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {formData.payment_type === 'REDUCE_TERM' ? 'Prazo' : 'Parcela'}
                  </p>
                  <p className="text-sm">
                    {formData.payment_type === 'REDUCE_TERM' ? (
                      <>
                        <span className="text-muted-foreground line-through mr-2">
                          {simulation.current_remaining_installments} meses
                        </span>
                        <span className="font-medium text-emerald-600">
                          {simulation.new_remaining_installments} meses
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground line-through mr-2">
                          {formatCurrency(simulation.current_installment_value)}
                        </span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(simulation.new_installment_value)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Economia Total</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(simulation.total_saved)}
                </span>
              </div>

              {formData.payment_type === 'REDUCE_TERM' && simulation.months_reduced > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-blue-50 text-blue-700 text-xs">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Voce reduzira {simulation.months_reduced} meses do financiamento e
                    economizara {formatCurrency(simulation.interest_saved)} em juros.
                  </span>
                </div>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={loading || !simulation}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Amortizacao
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
