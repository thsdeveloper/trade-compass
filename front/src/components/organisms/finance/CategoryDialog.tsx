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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  ColorPicker,
  IconSelector,
  DEFAULT_CATEGORY_ICONS,
} from '@/components/atoms/CategoryIcon';
import { BudgetCategorySelect } from '@/components/molecules/BudgetCategorySelect';
import type {
  FinanceCategory,
  CategoryFormData,
  FinanceCategoryType,
  BudgetCategory,
} from '@/types/finance';
import { CATEGORY_TYPE_LABELS } from '@/types/finance';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  category?: FinanceCategory | null;
}

const EXPENSE_TYPES: FinanceCategoryType[] = [
  'MORADIA',
  'ALIMENTACAO',
  'TRANSPORTE',
  'SAUDE',
  'LAZER',
  'EDUCACAO',
  'VESTUARIO',
  'SERVICOS',
  'OUTROS',
  'DIVIDA',
];

const initialFormData: CategoryFormData = {
  name: '',
  type: 'OUTROS',
  color: '#64748b',
  icon: 'Tag',
};

export function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  category,
}: CategoryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          budget_category: category.budget_category || undefined,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, category]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!category;
  const isValid = formData.name.trim();
  const isExpenseType = EXPENSE_TYPES.includes(formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing
              ? 'Atualize os dados da categoria'
              : 'Preencha os dados da categoria'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className="text-xs font-medium text-slate-600">
              Nome
            </Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Streaming, Assinaturas..."
              className="h-9 text-sm"
            />
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Tipo
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: FinanceCategoryType) =>
                  setFormData({
                    ...formData,
                    type: value,
                    icon: DEFAULT_CATEGORY_ICONS[value] || 'Tag',
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Cor
            </Label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Icone
            </Label>
            <IconSelector
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
              color={formData.color}
            />
          </div>

          {isExpenseType && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Categoria 50-30-20
              </Label>
              <BudgetCategorySelect
                value={formData.budget_category || null}
                onValueChange={(value: BudgetCategory) =>
                  setFormData({ ...formData, budget_category: value })
                }
              />
              <p className="text-xs text-slate-400">
                Define em qual bucket essa categoria se encaixa
              </p>
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
