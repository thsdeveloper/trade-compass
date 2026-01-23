'use client';

import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/types/finance';
import { TrendingDown, TrendingUp, Minus, Calculator } from 'lucide-react';

interface TRImpactSimulatorProps {
  currentBalance: number;
  remainingInstallments: number;
  baseAnnualRate: number;
  className?: string;
}

interface Scenario {
  id: string;
  name: string;
  trRate: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const scenarios: Scenario[] = [
  {
    id: 'zero',
    name: 'TR Zero',
    trRate: 0,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  {
    id: 'low',
    name: 'TR Baixa',
    trRate: 0.05,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Minus className="h-3.5 w-3.5" />,
  },
  {
    id: 'current',
    name: 'TR Atual',
    trRate: 0.08,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  {
    id: 'high',
    name: 'TR Alta',
    trRate: 0.15,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
];

export function TRImpactSimulator({
  currentBalance,
  remainingInstallments,
  baseAnnualRate,
  className,
}: TRImpactSimulatorProps) {
  const [customTR, setCustomTR] = useState(0.08);
  const [selectedScenario, setSelectedScenario] = useState<string>('current');

  const calculateProjection = (trMonthlyRate: number) => {
    let balance = currentBalance;
    const monthlyAmortization = currentBalance / remainingInstallments;
    const baseMonthlyRate = Math.pow(1 + baseAnnualRate / 100, 1 / 12) - 1;

    let totalInterest = 0;
    let totalTRImpact = 0;
    let totalPaid = 0;

    for (let i = 0; i < remainingInstallments && balance > 0; i++) {
      // TR impact on balance
      const trImpact = balance * (trMonthlyRate / 100);
      totalTRImpact += trImpact;
      balance += trImpact;

      // Interest
      const interest = balance * baseMonthlyRate;
      totalInterest += interest;

      // Payment
      const payment = monthlyAmortization + interest + 68.19; // insurance + admin
      totalPaid += payment;

      // Amortization
      balance -= monthlyAmortization;
    }

    return {
      totalPaid,
      totalInterest,
      totalTRImpact,
      effectiveRate: ((totalPaid / currentBalance - 1) * 100).toFixed(1),
    };
  };

  const projections = useMemo(() => {
    return scenarios.map((s) => ({
      ...s,
      projection: calculateProjection(s.trRate),
    }));
  }, [currentBalance, remainingInstallments, baseAnnualRate]);

  const customProjection = useMemo(() => {
    return calculateProjection(customTR);
  }, [customTR, currentBalance, remainingInstallments, baseAnnualRate]);

  const baseProjection = projections.find((p) => p.id === 'zero')?.projection;
  const currentProjection = projections.find((p) => p.id === 'current')?.projection;

  const differenceFromZero = baseProjection && currentProjection
    ? currentProjection.totalPaid - baseProjection.totalPaid
    : 0;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold tracking-tight">Simulador de Impacto da TR</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Compare cenarios de TR e veja quanto voce pagaria ao final do financiamento
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {projections.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                selectedScenario === scenario.id
                  ? scenario.bgColor
                  : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className={scenario.color}>{scenario.icon}</span>
                <span className="text-xs font-medium text-slate-700">{scenario.name}</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">TR Mensal</p>
                <p className={cn('text-sm font-mono font-semibold tabular-nums', scenario.color)}>
                  {scenario.trRate.toFixed(2)}%
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed">
                <p className="text-[10px] text-muted-foreground">Total a pagar</p>
                <p className="text-xs font-mono font-medium">
                  {formatCurrency(scenario.projection.totalPaid)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Slider */}
      <div className="p-4 border-b bg-slate-50/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-600">TR Personalizada</span>
          <span className="text-sm font-mono font-semibold tabular-nums text-slate-800">
            {customTR.toFixed(2)}%
          </span>
        </div>
        <Slider
          value={[customTR]}
          onValueChange={([value]) => setCustomTR(value)}
          min={0}
          max={0.25}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>0.25%</span>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="p-4">
        <div className="grid md:grid-cols-3 gap-4">
          {/* TR Impact */}
          <div className="p-3 rounded-lg bg-red-50/50 border border-red-100">
            <p className="text-[10px] text-red-600 uppercase tracking-wide font-medium">
              Custo da TR ({customTR.toFixed(2)}%)
            </p>
            <p className="text-lg font-mono font-bold tabular-nums text-red-600 mt-1">
              +{formatCurrency(customProjection.totalTRImpact)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Adicional ao saldo devedor
            </p>
          </div>

          {/* Total Interest */}
          <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
            <p className="text-[10px] text-amber-600 uppercase tracking-wide font-medium">
              Total de Juros
            </p>
            <p className="text-lg font-mono font-bold tabular-nums text-amber-600 mt-1">
              {formatCurrency(customProjection.totalInterest)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Juros ao longo do contrato
            </p>
          </div>

          {/* Total Payment */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium">
              Total a Pagar
            </p>
            <p className="text-lg font-mono font-bold tabular-nums text-slate-800 mt-1">
              {formatCurrency(customProjection.totalPaid)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Parcelas + juros + seguros
            </p>
          </div>
        </div>

        {/* Bottom comparison */}
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-red-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">
                Comparado com TR zero, voce pagara:
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold tabular-nums text-red-600">
                +{formatCurrency(customProjection.totalPaid - (baseProjection?.totalPaid || 0))}
              </p>
              <p className="text-[10px] text-muted-foreground">a mais</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
