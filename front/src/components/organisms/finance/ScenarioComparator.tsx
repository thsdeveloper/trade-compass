'use client';

import { useState, useCallback, useEffect } from 'react';

// Simple ID generator
let idCounter = 0;
const generateId = () => `scenario-${Date.now()}-${++idCounter}`;
import {
  GitCompare,
  Plus,
  Trash2,
  Loader2,
  Trophy,
  Clock,
  PiggyBank,
  Edit2,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AmortizationComparisonChart } from '@/components/molecules/AmortizationComparisonChart';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageExtraPaymentType,
  AmortizationSimulationResponse,
  AmortizationScenario,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import { cn } from '@/lib/utils';

interface ScenarioComparatorProps {
  mortgage: MortgageWithProgress;
  accessToken: string;
}

interface ScenarioConfig {
  id: string;
  name: string;
  type: 'ONE_TIME' | 'RECURRING';
  amount: number;
  payment_type: MortgageExtraPaymentType;
  color: string;
  isEditing: boolean;
}

const SCENARIO_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', chart: '#3b82f6' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', chart: '#10b981' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', chart: '#8b5cf6' },
];

export function ScenarioComparator({
  mortgage,
  accessToken,
}: ScenarioComparatorProps) {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  const [simulationResults, setSimulationResults] = useState<Map<string, AmortizationScenario>>(new Map());
  const [originalScenario, setOriginalScenario] = useState<AmortizationScenario | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Fetch original scenario on mount
  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const result = await financeApi.simulateMortgageAmortization(
          mortgage.id,
          { include_current_schedule: true },
          accessToken
        );
        const original = result.scenarios.find((s) => s.name === 'Original');
        if (original) {
          setOriginalScenario(original);
        }
      } catch (error) {
        console.error('Error fetching original:', error);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchOriginal();
  }, [mortgage.id, accessToken]);

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    const colorIndex = scenarios.length;
    const newScenario: ScenarioConfig = {
      id: generateId(),
      name: `Cenario ${scenarios.length + 1}`,
      type: 'RECURRING',
      amount: 0,
      payment_type: 'REDUCE_TERM',
      color: SCENARIO_COLORS[colorIndex]?.chart || '#64748b',
      isEditing: true,
    };
    setScenarios([...scenarios, newScenario]);
  };

  const updateScenario = (id: string, updates: Partial<ScenarioConfig>) => {
    setScenarios(
      scenarios.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id));
    const newResults = new Map(simulationResults);
    newResults.delete(id);
    setSimulationResults(newResults);
  };

  const fetchSimulations = useCallback(async () => {
    const validScenarios = scenarios.filter((s) => s.amount > 0 && !s.isEditing);
    if (validScenarios.length === 0) {
      setSimulationResults(new Map());
      return;
    }

    setSimulating(true);
    const results = new Map<string, AmortizationScenario>();

    try {
      for (const scenario of validScenarios) {
        const response = await financeApi.simulateMortgageAmortization(
          mortgage.id,
          {
            extra_payments: [
              {
                id: scenario.id,
                type: scenario.type,
                amount: scenario.amount,
                start_month: 1,
                payment_type: scenario.payment_type,
              },
            ],
            include_current_schedule: false,
          },
          accessToken
        );
        const simulated = response.scenarios.find((s) => s.name === 'Com Aportes');
        if (simulated) {
          results.set(scenario.id, {
            ...simulated,
            name: scenario.name,
          });
        }
      }
      setSimulationResults(results);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setSimulating(false);
    }
  }, [mortgage.id, scenarios, accessToken]);

  // Auto-simulate when scenarios change
  useEffect(() => {
    const timer = setTimeout(fetchSimulations, 700);
    return () => clearTimeout(timer);
  }, [fetchSimulations]);

  const getColorStyles = (index: number) => SCENARIO_COLORS[index] || SCENARIO_COLORS[0];

  // Find best scenario
  const bestScenario = Array.from(simulationResults.entries()).reduce<{
    id: string;
    totalSaved: number;
  } | null>((best, [id, scenario]) => {
    if (!originalScenario) return best;
    const saved = originalScenario.summary.total_paid - scenario.summary.total_paid;
    if (!best || saved > best.totalSaved) {
      return { id, totalSaved: saved };
    }
    return best;
  }, null);

  if (loadingInitial) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Carregando dados base...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scenarios Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitCompare className="h-5 w-5 text-primary" />
              Comparador de Cenarios
            </CardTitle>
            <Button
              onClick={addScenario}
              size="sm"
              variant="outline"
              disabled={scenarios.length >= 3}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cenario ({scenarios.length}/3)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
              <GitCompare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3 max-w-md">
                Crie ate 3 cenarios diferentes para comparar lado a lado o impacto de diferentes
                estrategias de amortizacao.
              </p>
              <Button onClick={addScenario} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Cenario
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {scenarios.map((scenario, index) => {
                const colors = getColorStyles(index);
                const result = simulationResults.get(scenario.id);
                const isBest = bestScenario?.id === scenario.id;

                return (
                  <div
                    key={scenario.id}
                    className={cn(
                      'rounded-lg border-2 p-4 space-y-3',
                      colors.bg,
                      colors.border,
                      isBest && 'ring-2 ring-yellow-400'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      {scenario.isEditing ? (
                        <Input
                          value={scenario.name}
                          onChange={(e) =>
                            updateScenario(scenario.id, { name: e.target.value })
                          }
                          className="h-7 text-sm font-medium w-[120px]"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', colors.text)}>
                            {scenario.name}
                          </span>
                          {isBest && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            updateScenario(scenario.id, { isEditing: !scenario.isEditing })
                          }
                        >
                          {scenario.isEditing ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Edit2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => removeScenario(scenario.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={scenario.type}
                          onValueChange={(value: 'ONE_TIME' | 'RECURRING') =>
                            updateScenario(scenario.id, { type: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ONE_TIME">Unico</SelectItem>
                            <SelectItem value="RECURRING">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={scenario.payment_type}
                          onValueChange={(value: MortgageExtraPaymentType) =>
                            updateScenario(scenario.id, { payment_type: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REDUCE_TERM">-Prazo</SelectItem>
                            <SelectItem value="REDUCE_INSTALLMENT">-Parcela</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <CurrencyInput
                        value={scenario.amount}
                        onChange={(value) => updateScenario(scenario.id, { amount: value })}
                        className="h-8 text-xs"
                        placeholder="Valor do aporte"
                      />
                    </div>

                    {/* Result */}
                    {result && (
                      <div className="pt-3 border-t border-current/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Prazo final</span>
                          <span className="font-medium tabular-nums">
                            {result.summary.final_installment_number} meses
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Juros totais</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(result.summary.total_interest)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Total a pagar</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(result.summary.total_paid)}
                          </span>
                        </div>
                        {originalScenario && (
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-current/10">
                            <span className={colors.text}>Economia</span>
                            <span className={cn('font-semibold tabular-nums', colors.text)}>
                              {formatCurrency(
                                originalScenario.summary.total_paid - result.summary.total_paid
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original vs Scenarios Comparison */}
      {originalScenario && simulationResults.size > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Comparativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Metrica</th>
                    <th className="text-right py-2 px-4 font-medium">Original</th>
                    {scenarios
                      .filter((s) => simulationResults.has(s.id))
                      .map((s, i) => (
                        <th
                          key={s.id}
                          className={cn(
                            'text-right py-2 px-4 font-medium',
                            getColorStyles(i).text
                          )}
                        >
                          {s.name}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Prazo (meses)</td>
                    <td className="py-2 px-4 text-right tabular-nums">
                      {originalScenario.summary.final_installment_number}
                    </td>
                    {scenarios
                      .filter((s) => simulationResults.has(s.id))
                      .map((s) => {
                        const result = simulationResults.get(s.id)!;
                        const diff =
                          originalScenario.summary.final_installment_number -
                          result.summary.final_installment_number;
                        return (
                          <td key={s.id} className="py-2 px-4 text-right tabular-nums">
                            {result.summary.final_installment_number}
                            {diff > 0 && (
                              <span className="text-emerald-600 text-xs ml-1">(-{diff})</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Juros totais</td>
                    <td className="py-2 px-4 text-right tabular-nums">
                      {formatCurrency(originalScenario.summary.total_interest)}
                    </td>
                    {scenarios
                      .filter((s) => simulationResults.has(s.id))
                      .map((s) => {
                        const result = simulationResults.get(s.id)!;
                        return (
                          <td key={s.id} className="py-2 px-4 text-right tabular-nums">
                            {formatCurrency(result.summary.total_interest)}
                          </td>
                        );
                      })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Total a pagar</td>
                    <td className="py-2 px-4 text-right tabular-nums font-medium">
                      {formatCurrency(originalScenario.summary.total_paid)}
                    </td>
                    {scenarios
                      .filter((s) => simulationResults.has(s.id))
                      .map((s) => {
                        const result = simulationResults.get(s.id)!;
                        return (
                          <td key={s.id} className="py-2 px-4 text-right tabular-nums font-medium">
                            {formatCurrency(result.summary.total_paid)}
                          </td>
                        );
                      })}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-emerald-600">Economia</td>
                    <td className="py-2 px-4 text-right text-muted-foreground">-</td>
                    {scenarios
                      .filter((s) => simulationResults.has(s.id))
                      .map((s) => {
                        const result = simulationResults.get(s.id)!;
                        const savings =
                          originalScenario.summary.total_paid - result.summary.total_paid;
                        return (
                          <td
                            key={s.id}
                            className="py-2 px-4 text-right tabular-nums font-semibold text-emerald-600"
                          >
                            {formatCurrency(savings)}
                          </td>
                        );
                      })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {simulating && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Calculando cenarios...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
