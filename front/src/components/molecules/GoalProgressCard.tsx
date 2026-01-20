'use client';

import { Target, Calendar, TrendingUp, Plus, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  GOAL_STATUS_LABELS,
  GOAL_PRIORITY_LABELS,
  getGoalStatusBgColor,
  getPriorityColor,
} from '@/types/finance';
import type { GoalWithProgress } from '@/types/finance';

interface GoalProgressCardProps {
  goal: GoalWithProgress;
  compact?: boolean;
  onClick?: () => void;
  onAddContribution?: () => void;
  onViewHistory?: () => void;
}

export function GoalProgressCard({ goal, compact, onClick, onAddContribution, onViewHistory }: GoalProgressCardProps) {
  const progressPercentage = Math.min(goal.progress_percentage, 100);

  // Calculate months remaining
  const getMonthsRemaining = () => {
    if (!goal.deadline) return null;
    const deadline = new Date(goal.deadline);
    const now = new Date();
    const months = (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
    return Math.max(0, months);
  };

  // Calculate monthly target
  const getMonthlyTarget = () => {
    const monthsRemaining = getMonthsRemaining();
    if (monthsRemaining === null || monthsRemaining === 0) return null;
    const remaining = goal.target_amount - goal.current_amount;
    return remaining > 0 ? remaining / monthsRemaining : 0;
  };

  const monthsRemaining = getMonthsRemaining();
  const monthlyTarget = getMonthlyTarget();

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 transition-all',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            <Target className="h-5 w-5" style={{ color: goal.color }} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{goal.name}</p>
            {!compact && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs px-1.5 py-0.5 rounded', getGoalStatusBgColor(goal.status))}>
                  {GOAL_STATUS_LABELS[goal.status]}
                </span>
                <span className={cn('text-xs', getPriorityColor(goal.priority))}>
                  {GOAL_PRIORITY_LABELS[goal.priority]}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(goal.current_amount)}
          </p>
          <p className="text-xs text-slate-400">
            de {formatCurrency(goal.target_amount)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">Progresso</span>
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: goal.color }}
          >
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>
      </div>

      {/* Additional Info (non-compact only) */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          {goal.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                {monthsRemaining !== null && monthsRemaining > 0 && (
                  <span className="text-slate-400"> ({monthsRemaining} meses)</span>
                )}
              </span>
            </div>
          )}
          {monthlyTarget !== null && monthlyTarget > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{formatCurrency(monthlyTarget)}/mes</span>
            </div>
          )}
        </div>
      )}

      {/* Contributions count and buttons */}
      {!compact && (
        <div className="mt-2 flex items-center justify-between">
          {onViewHistory && goal.contributions_count > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <History className="h-3 w-3" />
              {goal.contributions_count} contribuicao(oes)
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Nenhuma contribuicao
            </span>
          )}
          {onAddContribution && goal.status === 'ATIVO' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddContribution();
              }}
              className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
            >
              <Plus className="h-3 w-3" />
              Contribuir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
