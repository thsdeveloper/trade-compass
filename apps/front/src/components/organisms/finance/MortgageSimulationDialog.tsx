'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calculator, TrendingDown, Banknote, Calendar, PiggyBank } from 'lucide-react';
import { financeApi } from '@/lib/finance-api';
import type { MortgageWithProgress, EarlyPayoffSimulation } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface MortgageSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mortgage: MortgageWithProgress | null;
  accessToken: string;
}

export function MortgageSimulationDialog({
  open,
  onOpenChange,
  mortgage,
  accessToken,
}: MortgageSimulationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<EarlyPayoffSimulation | null>(null);

  useEffect(() => {
    if (open && mortgage) {
      fetchSimulation();
    }
  }, [open, mortgage]);

  const fetchSimulation = async () => {
    if (!mortgage || !accessToken) return;

    setLoading(true);
    try {
      const result = await financeApi.simulateMortgageEarlyPayoff(mortgage.id, accessToken);
      setSimulation(result);
    } catch (error) {
      console.error('Error simulating early payoff:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mortgage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Simulacao de Quitacao
          </DialogTitle>
          <DialogDescription>
            Veja quanto custaria quitar o financiamento hoje
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Calculando simulacao...
          </div>
        )}

        {simulation && !loading && (
          <div className="space-y-6 py-4">
            {/* Current State */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Situacao Atual</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Banknote className="h-3.5 w-3.5" />
                    Saldo Devedor
                  </div>
                  <p className="font-semibold">{formatCurrency(simulation.current_balance)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Parcelas Restantes
                  </div>
                  <p className="font-semibold">{simulation.remaining_installments} meses</p>
                </div>
              </div>
            </div>

            {/* What You Would Pay */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Se Continuar Pagando
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    Total de Pagamentos
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(simulation.total_remaining_payments)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    Juros a Pagar
                  </div>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(simulation.total_interest_remaining)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payoff Amount */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  <span className="font-medium">Valor para Quitacao</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(simulation.payoff_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Economia Total</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(simulation.total_savings)}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              * Valores aproximados. Consulte o banco para valores exatos de quitacao.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
