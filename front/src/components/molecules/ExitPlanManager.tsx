'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { Plus, X, GripVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PlannedExitFormData,
  ExitType,
  TradeDirection,
  FuturesAsset,
} from '@/types/daytrade';
import {
  EXIT_TYPE_LABELS,
  EXIT_TYPE_COLORS,
  TICK_VALUES,
} from '@/types/daytrade';

interface ExitPlanManagerProps {
  exits: PlannedExitFormData[];
  onChange: (exits: PlannedExitFormData[]) => void;
  totalContracts: number;
  entryPrice: number;
  direction: TradeDirection;
  asset: FuturesAsset;
  disabled?: boolean;
}

const EXIT_TYPE_OPTIONS: { value: ExitType; label: string }[] = [
  { value: 'STOP', label: 'Stop' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'TARGET', label: 'Alvo' },
  { value: 'BREAKEVEN', label: 'Breakeven' },
  { value: 'TIME_STOP', label: 'Stop Tempo' },
];

export function ExitPlanManager({
  exits,
  onChange,
  totalContracts,
  entryPrice,
  direction,
  asset,
  disabled = false,
}: ExitPlanManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Calcula contratos alocados e restantes
  const allocatedContracts = useMemo(() => {
    return exits.reduce((sum, exit) => sum + exit.contracts, 0);
  }, [exits]);

  const remainingContracts = totalContracts - allocatedContracts;

  // Validacao: soma de contratos nao pode exceder total
  const hasContractError = allocatedContracts > totalContracts;

  // Calcula R:R geral do plano
  const planMetrics = useMemo(() => {
    const stopExit = exits.find((e) => e.exit_type === 'STOP');
    const targetExits = exits.filter(
      (e) => e.exit_type === 'TARGET' || e.exit_type === 'PARTIAL'
    );

    if (!stopExit || targetExits.length === 0 || entryPrice === 0) {
      return { riskPoints: 0, rewardPoints: 0, rr: 0, riskValue: 0, rewardValue: 0 };
    }

    const riskPoints = Math.abs(entryPrice - stopExit.price);

    // Calcula reward ponderado por contratos
    let totalRewardPoints = 0;
    let totalRewardContracts = 0;
    for (const exit of targetExits) {
      const points = Math.abs(exit.price - entryPrice);
      totalRewardPoints += points * exit.contracts;
      totalRewardContracts += exit.contracts;
    }
    const avgRewardPoints =
      totalRewardContracts > 0 ? totalRewardPoints / totalRewardContracts : 0;

    const rr = riskPoints > 0 ? avgRewardPoints / riskPoints : 0;

    // Valores em R$
    const tickValue = TICK_VALUES[asset];
    const stopContracts = stopExit.contracts;
    const riskValue = riskPoints * stopContracts * tickValue;
    const rewardValue = totalRewardPoints * tickValue;

    return {
      riskPoints,
      rewardPoints: avgRewardPoints,
      rr,
      riskValue,
      rewardValue,
    };
  }, [exits, entryPrice, asset]);

  const handleAddExit = useCallback(() => {
    const newOrder = exits.length + 1;
    const defaultContracts = Math.max(1, remainingContracts);

    // Determina tipo padrao baseado no que ja existe
    let defaultType: ExitType = 'PARTIAL';
    const hasStop = exits.some((e) => e.exit_type === 'STOP');
    const hasTarget = exits.some((e) => e.exit_type === 'TARGET');

    if (!hasStop) {
      defaultType = 'STOP';
    } else if (!hasTarget && exits.length > 0) {
      defaultType = 'TARGET';
    }

    // Calcula preco padrao baseado na direcao e tipo
    let defaultPrice = entryPrice;
    if (defaultType === 'STOP') {
      defaultPrice = direction === 'BUY' ? entryPrice - 50 : entryPrice + 50;
    } else if (defaultType === 'TARGET' || defaultType === 'PARTIAL') {
      defaultPrice = direction === 'BUY' ? entryPrice + 100 : entryPrice - 100;
    }

    const newExit: PlannedExitFormData = {
      order: newOrder,
      exit_type: defaultType,
      price: defaultPrice,
      contracts: Math.min(defaultContracts, totalContracts),
      notes: '',
    };

    onChange([...exits, newExit]);
    setEditingIndex(exits.length);
  }, [exits, remainingContracts, entryPrice, direction, totalContracts, onChange]);

  const handleRemoveExit = useCallback(
    (index: number) => {
      const newExits = exits
        .filter((_, i) => i !== index)
        .map((exit, i) => ({ ...exit, order: i + 1 }));
      onChange(newExits);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    },
    [exits, onChange, editingIndex]
  );

  const handleUpdateExit = useCallback(
    (index: number, field: keyof PlannedExitFormData, value: unknown) => {
      const newExits = exits.map((exit, i) => {
        if (i === index) {
          return { ...exit, [field]: value };
        }
        return exit;
      });
      onChange(newExits);
    },
    [exits, onChange]
  );

  const getExitTypeColor = (type: ExitType) => {
    return EXIT_TYPE_COLORS[type];
  };

  const getPointsDisplay = (exit: PlannedExitFormData) => {
    if (entryPrice === 0) return '--';
    const points = exit.price - entryPrice;
    const displayPoints = direction === 'BUY' ? points : -points;
    const sign = displayPoints >= 0 ? '+' : '';
    return `${sign}${displayPoints.toFixed(0)} pts`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[12px] font-medium text-muted-foreground">
          Plano de Saidas
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={handleAddExit}
          disabled={disabled || remainingContracts <= 0}
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar
        </Button>
      </div>

      {/* Lista de saidas */}
      {exits.length > 0 ? (
        <div className="space-y-2">
          {exits.map((exit, index) => (
            <div
              key={index}
              className={cn(
                'group rounded-md border bg-muted/30 p-2.5 transition-all',
                editingIndex === index && 'border-primary/50 bg-muted/50'
              )}
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: getExitTypeColor(exit.exit_type),
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  {/* Linha 1: Tipo e Preco */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={exit.exit_type}
                      onValueChange={(value: ExitType) =>
                        handleUpdateExit(index, 'exit_type', value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-7 w-[100px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXIT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-[12px]"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <CurrencyInput
                      value={exit.price}
                      onChange={(value) =>
                        handleUpdateExit(index, 'price', value)
                      }
                      className="h-7 w-[100px] text-[11px]"
                      disabled={disabled}
                    />

                    <span
                      className={cn(
                        'text-[10px] font-medium tabular-nums',
                        exit.exit_type === 'STOP'
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      )}
                    >
                      {getPointsDisplay(exit)}
                    </span>
                  </div>

                  {/* Linha 2: Contratos */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Contratos:
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={totalContracts}
                        value={exit.contracts}
                        onChange={(e) =>
                          handleUpdateExit(
                            index,
                            'contracts',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="h-6 w-[60px] text-[11px]"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>

                {/* Botao remover */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemoveExit(index)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            Nenhuma saida planejada
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">
            Adicione stops, parciais e alvos
          </p>
        </div>
      )}

      {/* Resumo */}
      {exits.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Total:</span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    hasContractError && 'text-red-600'
                  )}
                >
                  {allocatedContracts}/{totalContracts} cts
                </span>
              </div>

              {hasContractError && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-[10px]">Excede total</span>
                </div>
              )}

              {!hasContractError && remainingContracts > 0 && (
                <span className="text-[10px] text-amber-600">
                  {remainingContracts} sem destino
                </span>
              )}
            </div>

            {planMetrics.rr > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Risco:</span>
                <span className="font-medium tabular-nums text-red-600">
                  {formatCurrency(planMetrics.riskValue)}
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-muted-foreground">R:R</span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    planMetrics.rr >= 2
                      ? 'text-emerald-600'
                      : planMetrics.rr >= 1
                        ? 'text-amber-600'
                        : 'text-red-600'
                  )}
                >
                  1:{planMetrics.rr.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
