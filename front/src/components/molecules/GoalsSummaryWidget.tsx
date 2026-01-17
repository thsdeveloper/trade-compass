'use client';

import { useRouter } from 'next/navigation';
import { Target, ChevronRight } from 'lucide-react';
import { GoalProgressCard } from './GoalProgressCard';
import { formatCurrency } from '@/types/finance';
import type { GoalWithProgress, GoalSummary } from '@/types/finance';

interface GoalsSummaryWidgetProps {
  goals: GoalWithProgress[];
  summary: GoalSummary;
}

export function GoalsSummaryWidget({ goals, summary }: GoalsSummaryWidgetProps) {
  const router = useRouter();

  if (summary.active_goals === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-medium text-slate-900">
            Objetivos Financeiros
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Target className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm text-slate-500">Nenhum objetivo ativo</p>
          <button
            onClick={() => router.push('/financas/objetivos')}
            className="mt-4 text-sm font-medium text-slate-900 hover:text-slate-700"
          >
            Criar primeiro objetivo
          </button>
        </div>
      </div>
    );
  }

  const topGoals = goals.slice(0, 3);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-900">
          Objetivos Financeiros
        </h2>
        <button
          onClick={() => router.push('/financas/objetivos')}
          className="flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Ver todos
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Overall Progress */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Progresso Geral</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
              {summary.overall_progress.toFixed(0)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">Contribuido</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
              {formatCurrency(summary.total_contributed)}
            </p>
            <p className="text-xs tabular-nums text-slate-400">
              de {formatCurrency(summary.total_target)}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${Math.min(summary.overall_progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Top Goals */}
      <div className="space-y-2 p-4">
        {topGoals.map((goal) => (
          <GoalProgressCard
            key={goal.id}
            goal={goal}
            compact
            onClick={() => router.push('/financas/objetivos')}
          />
        ))}
      </div>
    </div>
  );
}
