'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Clock,
  TrendingDown,
  PiggyBank,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageExtraPaymentType,
  AmortizationSimulationResponse,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface WhatIfSimulatorProps {
  mortgage: MortgageWithProgress;
  accessToken: string;
}

export function WhatIfSimulator({ mortgage, accessToken }: WhatIfSimulatorProps) {
  const [amount, setAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<MortgageExtraPaymentType>('REDUCE_TERM');
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<AmortizationSimulationResponse | null>(null);

  const handleSimulate = useCallback(async () => {
    if (!mortgage || !amount || amount <= 0) {
      setSimulation(null);
      return;
    }

    setSimulating(true);
    try {
      const result = await financeApi.simulateMortgageAmortization(
        mortgage.id,
        {
          extra_payments: [
            {
              id: 'whatif',
              type: 'ONE_TIME',
              amount,
              start_month: 1,
              payment_type: paymentType,
            },
          ],
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
  }, [mortgage, amount, paymentType, accessToken]);

  // Auto-simulate when amount or type changes (debounced)
  useEffect(() => {
    if (amount > 0) {
      const timer = setTimeout(() => {
        handleSimulate();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSimulation(null);
    }
  }, [amount, paymentType, handleSimulate]);

  const originalScenario = simulation?.scenarios.find((s) => s.name === 'Original');
  const withExtrasScenario = simulation?.scenarios.find((s) => s.name === 'Com Aportes');
  const comparison = simulation?.comparison;

  const currentBalance = mortgage.current_balance || mortgage.financed_amount;

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Simulacao Rapida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Balance Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Saldo devedor atual</span>
            <span className="font-semibold">{formatCurrency(currentBalance)}</span>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Amortizacao</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as MortgageExtraPaymentType)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem
                  value="REDUCE_TERM"
                  id="reduce_term"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="reduce_term"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Clock className="mb-2 h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Reduzir Prazo</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Mantem parcela, reduz meses
                  </span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem
                  value="REDUCE_INSTALLMENT"
                  id="reduce_installment"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="reduce_installment"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <TrendingDown className="mb-2 h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">Reduzir Parcela</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Mantem prazo, reduz valor
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Valor do aporte
            </Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onChange={setAmount}
              className="h-11 text-base"
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">
              Digite um valor para ver a simulacao em tempo real
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulating && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Calculando simulacao...</span>
          </CardContent>
        </Card>
      )}

      {simulation && !simulating && comparison && (
        <>
          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Original */}
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cenario Original
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prazo restante</span>
                  <span className="font-medium tabular-nums">
                    {originalScenario?.summary.final_installment_number} meses
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de juros</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(originalScenario?.summary.total_interest || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total a pagar</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(originalScenario?.summary.total_paid || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Previsao de termino</span>
                  <span className="font-medium">
                    {originalScenario?.summary.estimated_end_date
                      ? new Date(originalScenario.summary.estimated_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* With Extras */}
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-primary">
                  Com Aporte de {formatCurrency(amount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prazo restante</span>
                  <span className="font-medium tabular-nums text-emerald-600">
                    {withExtrasScenario?.summary.final_installment_number} meses
                    {comparison.months_reduced > 0 && (
                      <span className="text-xs ml-1">(-{comparison.months_reduced})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de juros</span>
                  <span className="font-medium tabular-nums text-emerald-600">
                    {formatCurrency(withExtrasScenario?.summary.total_interest || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total a pagar</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(withExtrasScenario?.summary.total_paid || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Previsao de termino</span>
                  <span className="font-medium text-emerald-600">
                    {withExtrasScenario?.summary.estimated_end_date
                      ? new Date(withExtrasScenario.summary.estimated_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings Summary */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2.5">
                    <PiggyBank className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Economia Total</p>
                    <p className="text-xs text-emerald-600">
                      Juros economizados: {formatCurrency(comparison.interest_saved)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(comparison.total_saved)}
                  </p>
                  {comparison.roi_percentage > 0 && (
                    <p className="text-xs text-emerald-600">
                      ROI: {comparison.roi_percentage.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {paymentType === 'REDUCE_TERM' && comparison.months_reduced > 0 && (
                <div className="flex items-start gap-2 mt-4 pt-4 border-t border-emerald-200">
                  <Info className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">
                    Com este aporte, voce reduzira <strong>{comparison.months_reduced} meses</strong> do
                    financiamento e economizara <strong>{formatCurrency(comparison.interest_saved)}</strong> em
                    juros ao longo do contrato.
                  </p>
                </div>
              )}

              {paymentType === 'REDUCE_INSTALLMENT' && (
                <div className="flex items-start gap-2 mt-4 pt-4 border-t border-emerald-200">
                  <Info className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">
                    Mantendo o prazo original, sua proxima parcela sera reduzida proporcionalmente
                    ao valor amortizado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!simulation && !simulating && amount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Simule seu aporte</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Digite um valor acima para ver instantaneamente quanto voce pode economizar
              em juros e quantos meses pode reduzir do seu financiamento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
