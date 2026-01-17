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
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import { ColorPicker } from '@/components/atoms/CategoryIcon';
import { AccountSelect } from '@/components/molecules/AccountSelect';
import type {
  GoalFormData,
  GoalWithProgress,
  AccountWithBank,
  FinanceGoalCategory,
  FinanceGoalPriority,
} from '@/types/finance';
import { GOAL_CATEGORY_LABELS, GOAL_PRIORITY_LABELS } from '@/types/finance';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: GoalFormData) => Promise<void>;
  goal?: GoalWithProgress | null;
  accounts: AccountWithBank[];
}

const initialFormData: GoalFormData = {
  name: '',
  goal_category: 'OUTROS',
  target_amount: 0,
  priority: 'MEDIA',
  icon: 'Target',
  color: '#3b82f6',
};

export function GoalDialog({
  open,
  onOpenChange,
  onSave,
  goal,
  accounts,
}: GoalDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (goal) {
        setFormData({
          name: goal.name,
          description: goal.description || '',
          goal_category: goal.goal_category,
          target_amount: goal.target_amount,
          deadline: goal.deadline || undefined,
          priority: goal.priority,
          linked_account_id: goal.linked_account_id || undefined,
          icon: goal.icon,
          color: goal.color,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, goal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!goal;
  const isValid = formData.name.trim() && formData.target_amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar objetivo' : 'Novo objetivo'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing
              ? 'Atualize os dados do objetivo'
              : 'Defina seu objetivo financeiro'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="goal-name"
              className="text-xs font-medium text-slate-600"
            >
              Nome do objetivo
            </Label>
            <Input
              id="goal-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Carro novo, Viagem para Europa..."
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Categoria
              </Label>
              <Select
                value={formData.goal_category}
                onValueChange={(value: FinanceGoalCategory) =>
                  setFormData({ ...formData, goal_category: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Prioridade
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: FinanceGoalPriority) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_PRIORITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="target_amount"
                className="text-xs font-medium text-slate-600"
              >
                Valor alvo (R$)
              </Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.target_amount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Prazo (opcional)
              </Label>
              <DatePicker
                value={formData.deadline}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    deadline: date,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Conta vinculada (opcional)
            </Label>
            <AccountSelect
              value={formData.linked_account_id || ''}
              onChange={(value) =>
                setFormData({ ...formData, linked_account_id: value || undefined })
              }
              accounts={accounts}
              placeholder="Vincular a uma conta"
              allowAll
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-medium text-slate-600"
            >
              Descricao (opcional)
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descreva seu objetivo..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Cor</Label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
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
            className="h-8 bg-slate-900 hover:bg-slate-800"
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
