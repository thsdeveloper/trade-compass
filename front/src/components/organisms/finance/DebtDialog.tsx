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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { DebtFormData, DebtType, DebtWithNegotiation } from '@/types/finance';
import { DEBT_TYPE_LABELS, formatCurrency } from '@/types/finance';

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DebtFormData) => Promise<void>;
  debt?: DebtWithNegotiation | null;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

const DEBT_TYPES: DebtType[] = [
  'BANCO',
  'CARTAO_CREDITO',
  'EMPRESTIMO_PESSOAL',
  'FINANCIAMENTO',
  'CHEQUE_ESPECIAL',
  'BOLETO',
  'FORNECEDOR',
  'OUTROS',
];

export function DebtDialog({ open, onOpenChange, onSave, debt }: DebtDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<DebtFormData>({
    creditor_name: '',
    debt_type: 'BANCO',
    original_amount: 0,
    updated_amount: 0,
    original_due_date: getCurrentDate(),
  });

  useEffect(() => {
    if (debt) {
      setFormData({
        creditor_name: debt.creditor_name,
        debt_type: debt.debt_type,
        original_amount: debt.original_amount,
        updated_amount: debt.updated_amount,
        original_due_date: debt.original_due_date,
        contract_number: debt.contract_number || undefined,
        creditor_document: debt.creditor_document || undefined,
        creditor_contact_phone: debt.creditor_contact_phone || undefined,
        creditor_contact_email: debt.creditor_contact_email || undefined,
        notes: debt.notes || undefined,
      });
    } else {
      setFormData({
        creditor_name: '',
        debt_type: 'BANCO',
        original_amount: 0,
        updated_amount: 0,
        original_due_date: getCurrentDate(),
      });
    }
    setActiveTab('basic');
  }, [debt, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.creditor_name.trim()) {
      alert('Informe o nome do credor');
      return;
    }

    if (formData.original_amount <= 0) {
      alert('O valor original deve ser maior que zero');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!debt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Divida' : 'Nova Divida'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da divida'
              : 'Registre uma nova divida para acompanhar o processo de negociacao'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Dados Basicos</TabsTrigger>
              <TabsTrigger value="extended">Dados Adicionais</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditor_name" className="text-xs font-medium">
                  Nome do Credor <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="creditor_name"
                  value={formData.creditor_name}
                  onChange={(e) =>
                    setFormData({ ...formData, creditor_name: e.target.value })
                  }
                  placeholder="Ex: Banco do Brasil, Nubank..."
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt_type" className="text-xs font-medium">
                  Tipo de Divida <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.debt_type}
                  onValueChange={(value: DebtType) =>
                    setFormData({ ...formData, debt_type: value })
                  }
                >
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {DEBT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="original_amount" className="text-xs font-medium">
                    Valor Original <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="original_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.original_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        original_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0,00"
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updated_amount" className="text-xs font-medium">
                    Valor Atualizado <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="updated_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.updated_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        updated_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0,00"
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_due_date" className="text-xs font-medium">
                  Data de Vencimento Original <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="original_due_date"
                  type="date"
                  value={formData.original_due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, original_due_date: e.target.value })
                  }
                  className="h-9 text-[13px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="extended" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract_number" className="text-xs font-medium">
                  Numero do Contrato
                </Label>
                <Input
                  id="contract_number"
                  value={formData.contract_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_number: e.target.value })
                  }
                  placeholder="Ex: 123456789"
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditor_document" className="text-xs font-medium">
                  CPF/CNPJ do Credor
                </Label>
                <Input
                  id="creditor_document"
                  value={formData.creditor_document || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, creditor_document: e.target.value })
                  }
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditor_contact_phone" className="text-xs font-medium">
                    Telefone de Contato
                  </Label>
                  <Input
                    id="creditor_contact_phone"
                    value={formData.creditor_contact_phone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor_contact_phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditor_contact_email" className="text-xs font-medium">
                    Email de Contato
                  </Label>
                  <Input
                    id="creditor_contact_email"
                    type="email"
                    value={formData.creditor_contact_email || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor_contact_email: e.target.value })
                    }
                    placeholder="email@credor.com"
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
                  placeholder="Informacoes adicionais sobre a divida..."
                  className="min-h-[80px] text-[13px]"
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
