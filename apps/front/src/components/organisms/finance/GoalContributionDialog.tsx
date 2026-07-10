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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, PiggyBank } from 'lucide-react';
import type { GoalContributionFormData, GoalWithProgress } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface GoalContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: GoalContributionFormData) => Promise<void>;
  goal: GoalWithProgress | null;
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function GoalContributionDialog({
  open,
  onOpenChange,
  onSave,
  goal,
}: GoalContributionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<GoalContributionFormData>({
    amount: 0,
    contribution_date: getCurrentDate(),
    description: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        amount: 0,
        contribution_date: getCurrentDate(),
        description: '',
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

  const remaining = goal ? goal.target_amount - goal.current_amount : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
            Adicionar contribuicao
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {goal ? (
              <>
                Contribua para o objetivo <span className="font-medium">{goal.name}</span>
              </>
            ) : (
              'Adicione uma contribuicao manual'
            )}
          </DialogDescription>
        </DialogHeader>

        {goal && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Meta</span>
              <span className="font-medium tabular-nums">{formatCurrency(goal.target_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Atual</span>
              <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(goal.current_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Faltam</span>
              <span className="font-medium tabular-nums text-amber-600">{formatCurrency(Math.max(0, remaining))}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="contribution-amount"
              className="text-xs font-medium text-slate-600"
            >
              Valor (R$) <span className="text-red-500">*</span>
            </Label>
            <CurrencyInput
              id="contribution-amount"
              value={formData.amount}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  amount: value,
                })
              }
              placeholder="0,00"
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Data da contribuicao <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={formData.contribution_date}
              onChange={(date) =>
                setFormData({
                  ...formData,
                  contribution_date: date,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="contribution-description"
              className="text-xs font-medium text-slate-600"
            >
              Descricao (opcional)
            </Label>
            <Textarea
              id="contribution-description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Bonus do trabalho, Rendimento de investimento..."
              rows={2}
              className="text-sm"
            />
          </div>
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
            Contribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
