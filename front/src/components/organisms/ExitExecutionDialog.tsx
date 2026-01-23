'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ActualExitFormData,
  ExitType,
  PlannedExit,
  DayTradeWithExits,
  FuturesAsset,
  TradeDirection,
} from '@/types/daytrade';
import {
  EXIT_TYPE_LABELS,
  EXIT_TYPE_COLORS,
  calculateExitResult,
} from '@/types/daytrade';

interface ExitExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ActualExitFormData) => Promise<void>;
  trade: DayTradeWithExits;
  remainingContracts: number;
}

// Get current local datetime in datetime-local format
function getCurrentLocalDatetime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const EXIT_TYPE_OPTIONS: { value: ExitType; label: string }[] = [
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'TARGET', label: 'Alvo' },
  { value: 'STOP', label: 'Stop' },
  { value: 'BREAKEVEN', label: 'Breakeven' },
  { value: 'TIME_STOP', label: 'Stop por Tempo' },
];

export function ExitExecutionDialog({
  open,
  onOpenChange,
  onSave,
  trade,
  remainingContracts,
}: ExitExecutionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ActualExitFormData>({
    exit_type: 'PARTIAL',
    price: trade.entry_price,
    contracts: Math.min(1, remainingContracts),
    exit_time: getCurrentLocalDatetime(),
    planned_exit_id: null,
    notes: '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        exit_type: 'PARTIAL',
        price: trade.entry_price,
        contracts: Math.min(1, remainingContracts),
        exit_time: getCurrentLocalDatetime(),
        planned_exit_id: null,
        notes: '',
      });
    }
  }, [open, trade.entry_price, remainingContracts]);

  // Find unmatched planned exits
  const availablePlannedExits = useMemo(() => {
    const matchedIds = new Set(
      trade.actual_exits
        .filter((ae) => ae.planned_exit_id)
        .map((ae) => ae.planned_exit_id)
    );
    return trade.planned_exits.filter((pe) => !matchedIds.has(pe.id));
  }, [trade.planned_exits, trade.actual_exits]);

  // Calculate preview result
  const previewResult = useMemo(() => {
    return calculateExitResult(
      trade.asset,
      trade.direction,
      formData.contracts,
      trade.entry_price,
      formData.price
    );
  }, [trade.asset, trade.direction, formData.contracts, trade.entry_price, formData.price]);

  const handlePlannedExitSelect = (exitId: string) => {
    if (exitId === 'none') {
      setFormData({ ...formData, planned_exit_id: null });
      return;
    }

    const plannedExit = trade.planned_exits.find((pe) => pe.id === exitId);
    if (plannedExit) {
      setFormData({
        ...formData,
        planned_exit_id: exitId,
        exit_type: plannedExit.exit_type,
        price: plannedExit.price,
        contracts: Math.min(plannedExit.contracts, remainingContracts),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Registrar Saida
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Restam{' '}
            <span className="font-medium text-foreground">
              {remainingContracts} contratos
            </span>{' '}
            para fechar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vincular a saida planejada */}
          {availablePlannedExits.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[12px] font-medium">
                <Link2 className="mr-1 inline h-3 w-3" />
                Vincular ao Plano
              </Label>
              <Select
                value={formData.planned_exit_id ?? 'none'}
                onValueChange={handlePlannedExitSelect}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Selecionar saida planejada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[12px]">
                    Sem vinculo (saida nao planejada)
                  </SelectItem>
                  {availablePlannedExits.map((exit) => (
                    <SelectItem
                      key={exit.id}
                      value={exit.id}
                      className="text-[12px]"
                    >
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: EXIT_TYPE_COLORS[exit.exit_type] }}
                      />
                      {EXIT_TYPE_LABELS[exit.exit_type]} -{' '}
                      {exit.price.toLocaleString('pt-BR')} x{exit.contracts}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exit_type" className="text-[12px] font-medium">
                Tipo
              </Label>
              <Select
                value={formData.exit_type}
                onValueChange={(value: ExitType) =>
                  setFormData({ ...formData, exit_type: value })
                }
              >
                <SelectTrigger id="exit_type" className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXIT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-[12px]"
                    >
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: EXIT_TYPE_COLORS[opt.value] }}
                      />
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contracts" className="text-[12px] font-medium">
                Contratos
              </Label>
              <Input
                id="contracts"
                type="number"
                min={1}
                max={remainingContracts}
                value={formData.contracts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contracts: Math.min(
                      parseInt(e.target.value) || 1,
                      remainingContracts
                    ),
                  })
                }
                className="h-9 text-[13px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-[12px] font-medium">
                Preco de Saida
              </Label>
              <CurrencyInput
                id="price"
                value={formData.price}
                onChange={(value) =>
                  setFormData({ ...formData, price: value })
                }
                className="h-9 text-[13px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_time" className="text-[12px] font-medium">
                Horario
              </Label>
              <Input
                id="exit_time"
                type="datetime-local"
                value={formData.exit_time}
                onChange={(e) =>
                  setFormData({ ...formData, exit_time: e.target.value })
                }
                className="h-9 text-[13px]"
                required
              />
            </div>
          </div>

          {/* Preview do resultado */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">
                Resultado desta saida:
              </span>
              <div className="text-right">
                <span
                  className={cn(
                    'font-mono text-[14px] font-semibold tabular-nums',
                    previewResult.result >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  )}
                >
                  {previewResult.result >= 0 ? '+' : ''}
                  {formatCurrency(previewResult.result)}
                </span>
                <div className="text-[11px] text-muted-foreground">
                  {previewResult.points >= 0 ? '+' : ''}
                  {previewResult.points.toFixed(0)} pts
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[12px] font-medium">
              Observacoes
            </Label>
            <Input
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="h-9 text-[13px]"
              placeholder="Anotacoes sobre esta saida..."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-[13px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.contracts <= 0}
              className="h-8 px-4 text-[13px]"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
