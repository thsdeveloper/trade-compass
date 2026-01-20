'use client';

import { useState, useCallback, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { BankSelect } from '@/components/molecules/BankSelect';
import { ColorPicker } from '@/components/atoms/CategoryIcon';
import type {
  AccountWithBank,
  AccountFormData,
  FinanceAccountType,
  Bank,
} from '@/types/finance';
import { ACCOUNT_TYPE_LABELS } from '@/types/finance';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AccountFormData) => Promise<void>;
  onSearchBanks: (query: string) => Promise<Bank[]>;
  account?: AccountWithBank | null;
  banks?: Bank[];
  popularBanks?: Bank[];
}

const initialFormData: AccountFormData = {
  name: '',
  type: 'CONTA_CORRENTE',
  initial_balance: 0,
  color: '#64748b',
  icon: 'Wallet',
  bank_id: '',
};

export function AccountDialog({
  open,
  onOpenChange,
  onSave,
  onSearchBanks,
  account,
  banks = [],
  popularBanks = [],
}: AccountDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (account) {
        setFormData({
          name: account.name,
          type: account.type,
          initial_balance: account.initial_balance,
          color: account.color,
          icon: account.icon,
          bank_id: account.bank_id || '',
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, account]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!account;
  const isValid = formData.name.trim() && formData.bank_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar conta' : 'Nova conta'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing ? 'Atualize os dados da conta' : 'Preencha os dados da conta'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Banco
            </Label>
            <BankSelect
              value={formData.bank_id}
              onChange={(value) => setFormData({ ...formData, bank_id: value })}
              banks={banks}
              popularBanks={popularBanks}
              onSearch={onSearchBanks}
              placeholder="Selecione o banco"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-name" className="text-xs font-medium text-slate-600">
              Nome da conta
            </Label>
            <Input
              id="account-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Conta Principal, Poupanca..."
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Tipo
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: FinanceAccountType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="initial_balance" className="text-xs font-medium text-slate-600">
                Saldo inicial (R$)
              </Label>
              <CurrencyInput
                id="initial_balance"
                value={formData.initial_balance}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    initial_balance: value,
                  })
                }
                disabled={isEditing}
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
