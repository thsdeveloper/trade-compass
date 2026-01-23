'use client';

import {
  PiggyBank,
  Clock,
  TrendingDown,
  ArrowRight,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AmortizationScenarioSummary, AmortizationComparison } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface SimulatorSummaryCardProps {
  originalSummary?: AmortizationScenarioSummary;
  simulatedSummary?: AmortizationScenarioSummary;
  comparison: AmortizationComparison;
  totalExtraPayments?: number;
  className?: string;
}

export function SimulatorSummaryCard({
  originalSummary,
  simulatedSummary,
  comparison,
  totalExtraPayments,
  className,
}: SimulatorSummaryCardProps) {
  return (
    <Card className={cn('bg-gradient-to-br from-emerald-50 to-white border-emerald-200', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
          <PiggyBank className="h-5 w-5" />
          Resumo da Simulacao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Saved */}
          <div className="p-4 rounded-lg bg-white border border-emerald-100 text-center">
            <PiggyBank className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Economia Total</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {formatCurrency(comparison.total_saved)}
            </p>
          </div>

          {/* Interest Saved */}
          <div className="p-4 rounded-lg bg-white border border-emerald-100 text-center">
            <TrendingDown className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Juros Economizados</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">
              {formatCurrency(comparison.interest_saved)}
            </p>
          </div>

          {/* Months Reduced */}
          <div className="p-4 rounded-lg bg-white border border-emerald-100 text-center">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Meses Reduzidos</p>
            <p className="text-lg font-bold text-blue-600 tabular-nums">
              {comparison.months_reduced}
            </p>
          </div>

          {/* ROI */}
          <div className="p-4 rounded-lg bg-white border border-emerald-100 text-center">
            <Percent className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">ROI</p>
            <p className="text-lg font-bold text-purple-600 tabular-nums">
              {comparison.roi_percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Before/After Comparison */}
        {originalSummary && simulatedSummary && (
          <div className="p-4 rounded-lg bg-white border">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Before */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Cenario Original</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Prazo: </span>
                    <span className="font-medium tabular-nums">
                      {originalSummary.final_installment_number} meses
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(originalSummary.total_paid)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 rounded-full bg-emerald-100">
                  <ArrowRight className="h-5 w-5 text-emerald-600" />
                </div>
              </div>

              {/* After */}
              <div className="text-center">
                <p className="text-xs text-emerald-600 font-medium mb-2">Com Aportes</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Prazo: </span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {simulatedSummary.final_installment_number} meses
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {formatCurrency(simulatedSummary.total_paid)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extra Info */}
        {totalExtraPayments !== undefined && totalExtraPayments > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-100/50 text-sm">
            <span className="text-emerald-700">
              Investimento total em aportes extras
            </span>
            <span className="font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(totalExtraPayments)}
            </span>
          </div>
        )}

        {/* ROI Explanation */}
        {comparison.roi_percentage > 0 && (
          <p className="text-xs text-muted-foreground">
            <strong>ROI (Retorno sobre Investimento):</strong> Para cada R$ 1,00 investido em
            amortizacoes extras, voce economiza aproximadamente R${' '}
            {(comparison.roi_percentage / 100).toFixed(2)} em juros.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
