'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { PlanningStatus } from '@/types/finance';
import { PLANNING_STATUS_LABELS } from '@/types/finance';

interface StatusBadgeProps {
  status: PlanningStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<PlanningStatus, {
  bg: string;
  text: string;
  border: string;
  icon: React.ElementType;
}> = {
  on_track: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  at_risk: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: AlertTriangle,
  },
  over_budget: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: TrendingUp,
  },
  under_budget: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: TrendingDown,
  },
};

export function StatusBadge({
  status,
  showIcon = true,
  size = 'sm',
  className
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      )}
      {PLANNING_STATUS_LABELS[status]}
    </span>
  );
}
