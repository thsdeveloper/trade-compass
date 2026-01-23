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
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import type {
  FixedIncomeContributionFormData,
  FixedIncomeWithContributions,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface FixedIncomeContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FixedIncomeContributionFormData) => Promise<void>;
  investment: FixedIncomeWithContributions | null;
}

const initialFormData: FixedIncomeContributionFormData = {
  amount: 0,
  contribution_date: new Date().toISOString().split('T')[0],
};

export function FixedIncomeContributionDialog({
  open,
  onOpenChange,
  onSave,
  investment,
}: FixedIncomeContributionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FixedIncomeContributionFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        contribution_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving contribution:', err);
    } finally {
      setSaving(false);
    }
  };

  const isValid = formData.amount > 0 && formData.contribution_date;

  if (!investment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Novo aporte
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Adicionar aporte em {investment.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Investment Info */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor atual investido:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(investment.amount_invested)}
              </span>
            </div>
            {investment.contributions_count > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Aportes anteriores:</span>
                <span className="text-slate-700">
                  {investment.contributions_count} ({formatCurrency(investment.total_contributions)})
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium text-slate-600">
              Valor do aporte (R$)
            </Label>
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Data do aporte
            </Label>
            <DatePicker
              value={formData.contribution_date}
              onChange={(date) =>
                setFormData({ ...formData, contribution_date: date || '' })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium text-slate-600">
              Descricao (opcional)
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value || undefined })
              }
              placeholder="Ex: Aporte mensal, bonus recebido..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* New Total Preview */}
          {formData.amount > 0 && (
            <div className="rounded-md bg-emerald-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">Novo total investido:</span>
                <span className="font-semibold text-emerald-800">
                  {formatCurrency(investment.amount_invested + formData.amount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-8"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isValid}
            className="h-8 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Adicionar aporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
