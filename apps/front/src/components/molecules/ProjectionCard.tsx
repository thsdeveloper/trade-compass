'use client';

import { TrendingUp, TrendingDown, Minus, Home, ShoppingBag, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import type { PlanningProjection } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
} from '@/types/finance';

interface ProjectionCardProps {
  projection: PlanningProjection;
  className?: string;
}

const bucketIcons = {
  ESSENCIAL: Home,
  ESTILO_VIDA: ShoppingBag,
  INVESTIMENTO: PiggyBank,
};

const trendIcons = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
};

const trendColors = {
  increasing: 'text-red-500',
  stable: 'text-slate-400',
  decreasing: 'text-emerald-500',
};

export function ProjectionCard({ projection, className }: ProjectionCardProps) {
  const Icon = bucketIcons[projection.category];
  const TrendIcon = trendIcons[projection.trend];
  const color = BUDGET_CATEGORY_COLORS[projection.category];
  const progressPercentage = projection.ideal_amount > 0
    ? (projection.projected_end_of_month / projection.ideal_amount) * 100
    : 0;
  const difference = projection.projected_end_of_month - projection.ideal_amount;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4',
        className
      )}
      style={{ borderColor: `${color}40` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-sm font-medium text-slate-700">
            {BUDGET_CATEGORY_LABELS[projection.category]}
          </span>
        </div>
        <StatusBadge status={projection.status} size="sm" />
      </div>

      {/* Current and Projected */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Atual</span>
          <span className="text-sm font-medium tabular-nums text-slate-900">
            {formatCurrency(projection.current_amount)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Projecao fim do mes</span>
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              projection.status === 'over_budget' || projection.status === 'at_risk'
                ? 'text-red-600'
                : 'text-slate-900'
            )}
          >
            {formatCurrency(projection.projected_end_of_month)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Meta</span>
          <span className="text-sm tabular-nums text-slate-600">
            {formatCurrency(projection.ideal_amount)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`,
              backgroundColor: progressPercentage > 100 ? '#ef4444' : color,
            }}
          />
          {progressPercentage > 100 && (
            <div
              className="absolute top-0 right-0 h-full bg-red-200"
              style={{
                width: `${Math.min(progressPercentage - 100, 50)}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Footer metrics */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TrendIcon className={cn('h-3.5 w-3.5', trendColors[projection.trend])} />
          <span className="text-xs text-slate-500">
            {formatCurrency(projection.daily_average)}/dia
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              difference > 0 ? 'text-red-500' : 'text-emerald-500'
            )}
          >
            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
          </span>
          <span className="text-xs text-slate-400">
            ({projection.days_remaining} dias restantes)
          </span>
        </div>
      </div>
    </div>
  );
}
