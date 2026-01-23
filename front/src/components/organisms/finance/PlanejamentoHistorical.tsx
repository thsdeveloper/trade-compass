'use client';

import { BarChart3 } from 'lucide-react';
import { BudgetTrendChart } from '@/components/molecules/BudgetTrendChart';
import type { BudgetAnalysisReportData } from '@/types/reports';

interface PlanejamentoHistoricalProps {
  data: BudgetAnalysisReportData | null;
  isLoading?: boolean;
}

export function PlanejamentoHistorical({ data, isLoading }: PlanejamentoHistoricalProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
          <div className="h-[280px] w-full bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.months.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Evolucao Historica
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
            <BarChart3 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 mb-1">
            Dados historicos indisponiveis
          </p>
          <p className="text-xs text-slate-400">
            Continue registrando suas transacoes para visualizar a evolucao
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BudgetTrendChart data={data} />
    </div>
  );
}
