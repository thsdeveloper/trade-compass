'use client';

import { useState, useCallback, useEffect } from 'react';

// Simple ID generator
let idCounter = 0;
const generateId = () => `payment-${Date.now()}-${++idCounter}`;
import {
  Layers,
  Plus,
  Trash2,
  Loader2,
  PiggyBank,
  Calendar,
  TrendingDown,
  Clock,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AmortizationComparisonChart } from '@/components/molecules/AmortizationComparisonChart';
import { SimulatorSummaryCard } from '@/components/molecules/SimulatorSummaryCard';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageExtraPaymentType,
  ExtraPaymentConfig,
  AmortizationSimulationResponse,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MultiplePaymentsSimulatorProps {
  mortgage: MortgageWithProgress;
  accessToken: string;
}

interface LocalExtraPayment extends ExtraPaymentConfig {
  label?: string;
}

export function MultiplePaymentsSimulator({
  mortgage,
  accessToken,
}: MultiplePaymentsSimulatorProps) {
  const [payments, setPayments] = useState<LocalExtraPayment[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<AmortizationSimulationResponse | null>(null);

  const addPayment = () => {
    const newPayment: LocalExtraPayment = {
      id: generateId(),
      type: 'ONE_TIME',
      amount: 0,
      start_month: 1,
      end_month: null,
      payment_type: 'REDUCE_TERM',
    };
    setPayments([...payments, newPayment]);
  };

  const updatePayment = (id: string, updates: Partial<LocalExtraPayment>) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const fetchSimulation = useCallback(async () => {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) {
      setSimulation(null);
      return;
    }

    setSimulating(true);
    try {
      const result = await financeApi.simulateMortgageAmortization(
        mortgage.id,
        {
          extra_payments: validPayments.map((p) => ({
            id: p.id,
            type: p.type,
            amount: p.amount,
            start_month: p.start_month,
            end_month: p.end_month,
            payment_type: p.payment_type,
          })),
          include_current_schedule: true,
        },
        accessToken
      );
      setSimulation(result);
    } catch (error) {
      console.error('Error simulating:', error);
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  }, [mortgage.id, payments, accessToken]);

  // Auto-simulate when payments change (debounced)
  useEffect(() => {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length > 0) {
      const timer = setTimeout(fetchSimulation, 700);
      return () => clearTimeout(timer);
    } else {
      setSimulation(null);
    }
  }, [payments, fetchSimulation]);

  const totalExtraPayments = payments.reduce((sum, p) => {
    if (p.type === 'ONE_TIME') {
      return sum + p.amount;
    } else {
      const months = (p.end_month || mortgage.remaining_installments) - (p.start_month || 1) + 1;
      return sum + p.amount * months;
    }
  }, 0);

  const comparison = simulation?.comparison;
  const originalScenario = simulation?.scenarios.find((s) => s.name === 'Original');
  const withExtrasScenario = simulation?.scenarios.find((s) => s.name === 'Com Aportes');

  return (
    <div className="space-y-6">
      {/* Payments Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Configurar Aportes
            </CardTitle>
            <Button onClick={addPayment} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Aporte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
              <Layers className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum aporte configurado. Adicione aportes para simular diferentes cenarios.
              </p>
              <Button onClick={addPayment} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Aporte
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="p-4 rounded-lg border bg-muted/20 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Aporte #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={payment.type}
                        onValueChange={(value: 'ONE_TIME' | 'RECURRING') =>
                          updatePayment(payment.id, { type: value })
                        }
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONE_TIME">Unico</SelectItem>
                          <SelectItem value="RECURRING">Recorrente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label className="text-xs">Valor</Label>
                      <CurrencyInput
                        value={payment.amount}
                        onChange={(value) => updatePayment(payment.id, { amount: value })}
                        className="h-9 text-[13px]"
                      />
                    </div>

                    {/* Start Month */}
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {payment.type === 'ONE_TIME' ? 'Mes do aporte' : 'Mes inicial'}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={mortgage.remaining_installments}
                        value={payment.start_month || 1}
                        onChange={(e) =>
                          updatePayment(payment.id, { start_month: parseInt(e.target.value) || 1 })
                        }
                        className="h-9 text-[13px]"
                      />
                    </div>

                    {/* End Month (only for recurring) */}
                    {payment.type === 'RECURRING' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Mes final (vazio = ate o fim)</Label>
                        <Input
                          type="number"
                          min={payment.start_month || 1}
                          max={mortgage.remaining_installments}
                          value={payment.end_month || ''}
                          onChange={(e) =>
                            updatePayment(payment.id, {
                              end_month: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="Ate quitar"
                          className="h-9 text-[13px]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Type */}
                  <div className="space-y-2">
                    <Label className="text-xs">Destino da amortizacao</Label>
                    <RadioGroup
                      value={payment.payment_type}
                      onValueChange={(value: MortgageExtraPaymentType) =>
                        updatePayment(payment.id, { payment_type: value })
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="REDUCE_TERM" id={`reduce-term-${payment.id}`} />
                        <Label htmlFor={`reduce-term-${payment.id}`} className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Reduzir prazo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="REDUCE_INSTALLMENT" id={`reduce-inst-${payment.id}`} />
                        <Label htmlFor={`reduce-inst-${payment.id}`} className="text-xs flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> Reduzir parcela
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ))}
            </div>
          )}

          {payments.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Total de aportes configurados</span>
              <span className="font-semibold text-primary tabular-nums">
                {formatCurrency(totalExtraPayments)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulating && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Simulando cenario...</span>
          </CardContent>
        </Card>
      )}

      {simulation && !simulating && comparison && (
        <>
          {/* Summary */}
          <SimulatorSummaryCard
            originalSummary={originalScenario?.summary}
            simulatedSummary={withExtrasScenario?.summary}
            comparison={comparison}
            totalExtraPayments={totalExtraPayments}
          />

          {/* Chart */}
          {originalScenario && withExtrasScenario && (
            <AmortizationComparisonChart
              originalInstallments={originalScenario.installments}
              simulatedInstallments={withExtrasScenario.installments}
            />
          )}
        </>
      )}

      {payments.length > 0 && !simulation && !simulating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Configure valores maiores que zero para ver a simulacao.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
