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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type {
  MortgageFormData,
  MortgageAmortizationSystem,
  MortgageRateIndex,
  MortgageModality,
  MortgageWithProgress,
} from '@/types/finance';
import {
  MORTGAGE_AMORTIZATION_LABELS,
  MORTGAGE_RATE_INDEX_LABELS,
  MORTGAGE_MODALITY_LABELS,
} from '@/types/finance';

interface MortgageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MortgageFormData) => Promise<void>;
  mortgage?: MortgageWithProgress | null;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

const AMORTIZATION_SYSTEMS: MortgageAmortizationSystem[] = ['SAC', 'PRICE', 'SACRE'];
const RATE_INDEXES: MortgageRateIndex[] = ['TR', 'IPCA', 'IGPM', 'FIXO'];
const MODALITIES: MortgageModality[] = ['SFH', 'SFI', 'FGTS', 'SBPE', 'OUTROS'];

export function MortgageDialog({ open, onOpenChange, onSave, mortgage }: MortgageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<MortgageFormData>({
    contract_number: '',
    institution_name: '',
    modality: 'SFH',
    amortization_system: 'SAC',
    property_value: 0,
    financed_amount: 0,
    down_payment: 0,
    base_annual_rate: 0,
    rate_index: 'TR',
    is_reduced_rate_active: false,
    total_installments: 420,
    contract_start_date: getCurrentDate(),
    first_installment_date: getCurrentDate(),
    admin_fee: 25,
    alert_days_before: 5,
  });

  useEffect(() => {
    if (mortgage) {
      setFormData({
        contract_number: mortgage.contract_number,
        institution_name: mortgage.institution_name,
        institution_bank_id: mortgage.institution_bank_id || undefined,
        modality: mortgage.modality,
        amortization_system: mortgage.amortization_system,
        property_value: mortgage.property_value,
        financed_amount: mortgage.financed_amount,
        down_payment: mortgage.down_payment,
        base_annual_rate: mortgage.base_annual_rate,
        reduced_annual_rate: mortgage.reduced_annual_rate || undefined,
        rate_index: mortgage.rate_index,
        is_reduced_rate_active: mortgage.is_reduced_rate_active,
        total_installments: mortgage.total_installments,
        contract_start_date: mortgage.contract_start_date,
        first_installment_date: mortgage.first_installment_date,
        mip_rate: mortgage.mip_rate || undefined,
        dfi_rate: mortgage.dfi_rate || undefined,
        admin_fee: mortgage.admin_fee,
        alert_days_before: mortgage.alert_days_before,
        notes: mortgage.notes || undefined,
      });
    } else {
      setFormData({
        contract_number: '',
        institution_name: '',
        modality: 'SFH',
        amortization_system: 'SAC',
        property_value: 0,
        financed_amount: 0,
        down_payment: 0,
        base_annual_rate: 0,
        rate_index: 'TR',
        is_reduced_rate_active: false,
        total_installments: 420,
        contract_start_date: getCurrentDate(),
        first_installment_date: getCurrentDate(),
        admin_fee: 25,
        alert_days_before: 5,
      });
    }
    setActiveTab('basic');
  }, [mortgage, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contract_number.trim()) {
      alert('Informe o numero do contrato');
      return;
    }

    if (!formData.institution_name.trim()) {
      alert('Informe o nome da instituicao');
      return;
    }

    if (formData.property_value <= 0) {
      alert('O valor do imovel deve ser maior que zero');
      return;
    }

    if (formData.financed_amount <= 0) {
      alert('O valor financiado deve ser maior que zero');
      return;
    }

    if (formData.total_installments < 1 || formData.total_installments > 600) {
      alert('O prazo deve ser entre 1 e 600 parcelas');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving mortgage:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!mortgage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Financiamento' : 'Novo Financiamento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do financiamento imobiliario'
              : 'Cadastre um novo financiamento imobiliario para acompanhar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Contrato</TabsTrigger>
              <TabsTrigger value="values">Valores</TabsTrigger>
              <TabsTrigger value="rates">Taxas</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract_number" className="text-xs font-medium">
                  Numero do Contrato <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contract_number"
                  value={formData.contract_number}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_number: e.target.value })
                  }
                  placeholder="Ex: 1.7877.0152320-0"
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution_name" className="text-xs font-medium">
                  Instituicao Financeira <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="institution_name"
                  value={formData.institution_name}
                  onChange={(e) =>
                    setFormData({ ...formData, institution_name: e.target.value })
                  }
                  placeholder="Ex: Caixa Economica Federal"
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modality" className="text-xs font-medium">
                    Modalidade
                  </Label>
                  <Select
                    value={formData.modality}
                    onValueChange={(value: MortgageModality) =>
                      setFormData({ ...formData, modality: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MORTGAGE_MODALITY_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amortization_system" className="text-xs font-medium">
                    Sistema de Amortizacao
                  </Label>
                  <Select
                    value={formData.amortization_system}
                    onValueChange={(value: MortgageAmortizationSystem) =>
                      setFormData({ ...formData, amortization_system: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AMORTIZATION_SYSTEMS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MORTGAGE_AMORTIZATION_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_start_date" className="text-xs font-medium">
                    Data do Contrato <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    id="contract_start_date"
                    value={formData.contract_start_date}
                    onChange={(value) =>
                      setFormData({ ...formData, contract_start_date: value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_installment_date" className="text-xs font-medium">
                    1a Parcela <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    id="first_installment_date"
                    value={formData.first_installment_date}
                    onChange={(value) =>
                      setFormData({ ...formData, first_installment_date: value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_installments" className="text-xs font-medium">
                  Prazo Total (parcelas) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_installments"
                  type="number"
                  min={1}
                  max={600}
                  value={formData.total_installments}
                  onChange={(e) =>
                    setFormData({ ...formData, total_installments: parseInt(e.target.value) || 0 })
                  }
                  className="h-9 text-[13px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="values" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="property_value" className="text-xs font-medium">
                  Valor do Imovel <span className="text-red-500">*</span>
                </Label>
                <CurrencyInput
                  id="property_value"
                  value={formData.property_value}
                  onChange={(value) =>
                    setFormData({ ...formData, property_value: value })
                  }
                  placeholder="0,00"
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="down_payment" className="text-xs font-medium">
                    Entrada
                  </Label>
                  <CurrencyInput
                    id="down_payment"
                    value={formData.down_payment}
                    onChange={(value) =>
                      setFormData({ ...formData, down_payment: value })
                    }
                    placeholder="0,00"
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financed_amount" className="text-xs font-medium">
                    Valor Financiado <span className="text-red-500">*</span>
                  </Label>
                  <CurrencyInput
                    id="financed_amount"
                    value={formData.financed_amount}
                    onChange={(value) =>
                      setFormData({ ...formData, financed_amount: value })
                    }
                    placeholder="0,00"
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_fee" className="text-xs font-medium">
                  Tarifa Administrativa (mensal)
                </Label>
                <CurrencyInput
                  id="admin_fee"
                  value={formData.admin_fee}
                  onChange={(value) =>
                    setFormData({ ...formData, admin_fee: value })
                  }
                  placeholder="25,00"
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
                  placeholder="Informacoes adicionais sobre o financiamento..."
                  className="min-h-[80px] text-[13px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="rates" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_annual_rate" className="text-xs font-medium">
                    Taxa Anual (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="base_annual_rate"
                    type="number"
                    step="0.0001"
                    value={formData.base_annual_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, base_annual_rate: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="8.99"
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_index" className="text-xs font-medium">
                    Indice de Correcao
                  </Label>
                  <Select
                    value={formData.rate_index}
                    onValueChange={(value: MortgageRateIndex) =>
                      setFormData({ ...formData, rate_index: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_INDEXES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {MORTGAGE_RATE_INDEX_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Taxa Reduzida</Label>
                  <p className="text-xs text-muted-foreground">
                    Ex: debito automatico em conta
                  </p>
                </div>
                <Switch
                  checked={formData.is_reduced_rate_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_reduced_rate_active: checked })
                  }
                />
              </div>

              {formData.is_reduced_rate_active && (
                <div className="space-y-2">
                  <Label htmlFor="reduced_annual_rate" className="text-xs font-medium">
                    Taxa Reduzida (%)
                  </Label>
                  <Input
                    id="reduced_annual_rate"
                    type="number"
                    step="0.0001"
                    value={formData.reduced_annual_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, reduced_annual_rate: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="8.70"
                    className="h-9 text-[13px]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mip_rate" className="text-xs font-medium">
                    Taxa MIP (%)
                  </Label>
                  <Input
                    id="mip_rate"
                    type="number"
                    step="0.0001"
                    value={formData.mip_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, mip_rate: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="0.0256"
                    className="h-9 text-[13px]"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Seguro Morte e Invalidez
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dfi_rate" className="text-xs font-medium">
                    Taxa DFI (%)
                  </Label>
                  <Input
                    id="dfi_rate"
                    type="number"
                    step="0.0001"
                    value={formData.dfi_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, dfi_rate: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="0.0080"
                    className="h-9 text-[13px]"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Seguro Danos Fisicos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_days_before" className="text-xs font-medium">
                  Alerta (dias antes do vencimento)
                </Label>
                <Input
                  id="alert_days_before"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.alert_days_before}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_days_before: parseInt(e.target.value) || 5 })
                  }
                  className="h-9 text-[13px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
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
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
