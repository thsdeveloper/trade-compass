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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  FixedIncomeFormData,
  FixedIncomeWithYield,
  FixedIncomeType,
  FixedIncomeRateType,
  FixedIncomeRateIndex,
  FixedIncomeLiquidity,
  FixedIncomeMarket,
  GoalSelectItem,
} from '@/types/finance';
import {
  FIXED_INCOME_TYPE_LABELS,
  FIXED_INCOME_RATE_TYPE_LABELS,
  FIXED_INCOME_RATE_INDEX_LABELS,
  FIXED_INCOME_LIQUIDITY_LABELS,
  FIXED_INCOME_MARKET_LABELS,
} from '@/types/finance';

interface FixedIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FixedIncomeFormData) => Promise<void>;
  investment?: FixedIncomeWithYield | null;
  goals?: GoalSelectItem[];
}

const initialFormData: FixedIncomeFormData = {
  investment_type: 'CDB',
  name: '',
  issuer: '',
  rate_type: 'PRE_FIXADO',
  rate_value: 0,
  rate_index: 'NENHUM',
  rate_spread: 0,
  amount_invested: 0,
  purchase_date: new Date().toISOString().split('T')[0],
  maturity_date: '',
  liquidity_type: 'NO_VENCIMENTO',
  market: 'PRIMARIO',
};

export function FixedIncomeDialog({
  open,
  onOpenChange,
  onSave,
  investment,
  goals,
}: FixedIncomeDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FixedIncomeFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (investment) {
        setFormData({
          investment_type: investment.investment_type,
          name: investment.name,
          issuer: investment.issuer,
          rate_type: investment.rate_type,
          rate_value: investment.rate_value,
          rate_index: investment.rate_index,
          rate_spread: investment.rate_spread,
          amount_invested: investment.amount_invested,
          current_value: investment.current_value ?? undefined,
          minimum_investment: investment.minimum_investment ?? undefined,
          purchase_date: investment.purchase_date,
          maturity_date: investment.maturity_date,
          liquidity_type: investment.liquidity_type,
          market: investment.market,
          broker: investment.broker ?? undefined,
          custody_account: investment.custody_account ?? undefined,
          notes: investment.notes ?? undefined,
          goal_id: investment.goal_id ?? undefined,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, investment]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving fixed income:', err);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!investment;
  const isValid =
    formData.name.trim() &&
    formData.issuer.trim() &&
    formData.amount_invested > 0 &&
    formData.purchase_date &&
    formData.maturity_date &&
    new Date(formData.maturity_date) > new Date(formData.purchase_date);

  const showIndexFields = formData.rate_type === 'POS_FIXADO' || formData.rate_type === 'HIBRIDO';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar investimento' : 'Novo investimento'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditing
              ? 'Atualize os dados do investimento'
              : 'Adicione um novo investimento em renda fixa'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo e Nome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Tipo de investimento
              </Label>
              <Select
                value={formData.investment_type}
                onValueChange={(value: FixedIncomeType) =>
                  setFormData({ ...formData, investment_type: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIXED_INCOME_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-slate-600">
                Nome
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: CDB XP 14,39%"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Emissor */}
          <div className="space-y-1.5">
            <Label htmlFor="issuer" className="text-xs font-medium text-slate-600">
              Emissor / Banco
            </Label>
            <Input
              id="issuer"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              placeholder="Ex: Banco XP, Tesouro Nacional..."
              className="h-9 text-sm"
            />
          </div>

          {/* Tipo de Taxa */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Tipo de taxa</Label>
            <div className="flex gap-2">
              {Object.entries(FIXED_INCOME_RATE_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      rate_type: key as FixedIncomeRateType,
                      rate_index: key === 'PRE_FIXADO' ? 'NENHUM' : formData.rate_index,
                    })
                  }
                  className={cn(
                    'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    formData.rate_type === key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Taxa e Indexador */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rate_value" className="text-xs font-medium text-slate-600">
                {formData.rate_type === 'POS_FIXADO' ? '% do indexador' : 'Taxa (% a.a.)'}
              </Label>
              <Input
                id="rate_value"
                type="number"
                step="0.01"
                value={formData.rate_value || ''}
                onChange={(e) =>
                  setFormData({ ...formData, rate_value: parseFloat(e.target.value) || 0 })
                }
                placeholder="0,00"
                className="h-9 text-sm"
              />
            </div>

            {showIndexFields && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Indexador</Label>
                  <Select
                    value={formData.rate_index || 'CDI'}
                    onValueChange={(value: FixedIncomeRateIndex) =>
                      setFormData({ ...formData, rate_index: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIXED_INCOME_RATE_INDEX_LABELS)
                        .filter(([key]) => key !== 'NENHUM')
                        .map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-sm">
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.rate_type === 'HIBRIDO' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rate_spread" className="text-xs font-medium text-slate-600">
                      Spread (% a.a.)
                    </Label>
                    <Input
                      id="rate_spread"
                      type="number"
                      step="0.01"
                      value={formData.rate_spread || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, rate_spread: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0,00"
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount_invested" className="text-xs font-medium text-slate-600">
                Valor investido (R$)
              </Label>
              <CurrencyInput
                id="amount_invested"
                value={formData.amount_invested}
                onChange={(value) => setFormData({ ...formData, amount_invested: value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current_value" className="text-xs font-medium text-slate-600">
                Valor atual (R$) - opcional
              </Label>
              <CurrencyInput
                id="current_value"
                value={formData.current_value || 0}
                onChange={(value) =>
                  setFormData({ ...formData, current_value: value || undefined })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Data de compra</Label>
              <DatePicker
                value={formData.purchase_date}
                onChange={(date) => setFormData({ ...formData, purchase_date: date || '' })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Data de vencimento</Label>
              <DatePicker
                value={formData.maturity_date}
                onChange={(date) => setFormData({ ...formData, maturity_date: date || '' })}
              />
            </div>
          </div>

          {/* Liquidez e Mercado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Liquidez</Label>
              <Select
                value={formData.liquidity_type || 'NO_VENCIMENTO'}
                onValueChange={(value: FixedIncomeLiquidity) =>
                  setFormData({ ...formData, liquidity_type: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIXED_INCOME_LIQUIDITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Mercado</Label>
              <div className="flex gap-2">
                {Object.entries(FIXED_INCOME_MARKET_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, market: key as FixedIncomeMarket })}
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      formData.market === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Corretora */}
          <div className="space-y-1.5">
            <Label htmlFor="broker" className="text-xs font-medium text-slate-600">
              Corretora (opcional)
            </Label>
            <Input
              id="broker"
              value={formData.broker || ''}
              onChange={(e) => setFormData({ ...formData, broker: e.target.value || undefined })}
              placeholder="Ex: XP, Rico, Clear..."
              className="h-9 text-sm"
            />
          </div>

          {/* Vincular a objetivo */}
          {goals && goals.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Vincular a objetivo (opcional)
              </Label>
              <Select
                value={formData.goal_id || '__none__'}
                onValueChange={(value) =>
                  setFormData({ ...formData, goal_id: value === '__none__' ? undefined : value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione um objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                O valor atual deste investimento contribuira para o progresso do objetivo
              </p>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-slate-600">
              Observacoes (opcional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
              placeholder="Anotacoes sobre o investimento..."
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
