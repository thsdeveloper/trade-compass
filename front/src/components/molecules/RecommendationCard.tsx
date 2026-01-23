'use client';

import { AlertTriangle, Lightbulb, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanningRecommendation } from '@/types/finance';
import { BUDGET_CATEGORY_LABELS } from '@/types/finance';

interface RecommendationCardProps {
  recommendation: PlanningRecommendation;
  className?: string;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    descColor: 'text-amber-700',
  },
  suggestion: {
    icon: Lightbulb,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    descColor: 'text-blue-700',
  },
  achievement: {
    icon: Trophy,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-800',
    descColor: 'text-emerald-700',
  },
};

const priorityBadge = {
  high: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media' },
  low: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Baixa' },
};

export function RecommendationCard({ recommendation, className }: RecommendationCardProps) {
  const config = typeConfig[recommendation.type];
  const Icon = config.icon;
  const priority = priorityBadge[recommendation.priority];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-sm',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
            recommendation.type === 'warning' ? 'bg-amber-100' :
            recommendation.type === 'suggestion' ? 'bg-blue-100' : 'bg-emerald-100'
          )}
        >
          <Icon className={cn('h-4 w-4', config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('text-sm font-medium', config.titleColor)}>
              {recommendation.title}
            </h4>
            {recommendation.type === 'warning' && (
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', priority.bg, priority.text)}>
                {priority.label}
              </span>
            )}
          </div>
          <p className={cn('text-sm', config.descColor)}>
            {recommendation.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {BUDGET_CATEGORY_LABELS[recommendation.category]}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className={cn('h-4 w-4 flex-shrink-0 mt-1', config.iconColor, 'opacity-50')} />
      </div>
    </div>
  );
}
