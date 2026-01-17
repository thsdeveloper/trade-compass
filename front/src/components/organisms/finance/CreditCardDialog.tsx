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
import { ColorPicker } from '@/components/atoms/CategoryIcon';
import type {
  FinanceCreditCard,
  CreditCardFormData,
  CreditCardBrand,
} from '@/types/finance';
import { CREDIT_CARD_BRAND_LABELS } from '@/types/finance';

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreditCardFormData) => Promise<void>;
  creditCard?: FinanceCreditCard | null;
}

const initialFormData: CreditCardFormData = {
  name: '',
  brand: 'VISA',
  total_limit: 0,
  closing_day: 1,
  due_day: 10,
  color: '#64748b',
};

export function CreditCardDialog({
  open,
  onOpenChange,
  onSave,
  creditCard,
}: CreditCardDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreditCardFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (creditCard) {
        setFormData({
          name: creditCard.name,
          brand: creditCard.brand,
          total_limit: creditCard.total_limit,
          closing_day: creditCard.closing_day,
          due_day: creditCard.due_day,
          color: creditCard.color,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, creditCard]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving credit card:', err);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!creditCard;
  const isValid = formData.name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar cartao' : 'Novo cartao'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing ? 'Atualize os dados do cartao' : 'Preencha os dados do cartao'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-name" className="text-xs font-medium text-slate-600">
              Nome
            </Label>
            <Input
              id="card-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Nubank, Inter..."
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Bandeira
              </Label>
              <Select
                value={formData.brand}
                onValueChange={(value: CreditCardBrand) =>
                  setFormData({ ...formData, brand: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CREDIT_CARD_BRAND_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_limit" className="text-xs font-medium text-slate-600">
                Limite (R$)
              </Label>
              <Input
                id="total_limit"
                type="number"
                step="0.01"
                value={formData.total_limit || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_limit: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="closing_day" className="text-xs font-medium text-slate-600">
                Dia fechamento
              </Label>
              <Input
                id="closing_day"
                type="number"
                min="1"
                max="31"
                value={formData.closing_day}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    closing_day: parseInt(e.target.value) || 1,
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_day" className="text-xs font-medium text-slate-600">
                Dia vencimento
              </Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    due_day: parseInt(e.target.value) || 10,
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Cor
            </Label>
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
