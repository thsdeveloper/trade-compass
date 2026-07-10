'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BudgetAllocation } from '@/types/finance';

interface BudgetHealthScoreProps {
  allocations: BudgetAllocation[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function calculateHealthScore(allocations: BudgetAllocation[]): number {
  if (allocations.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  allocations.forEach((allocation) => {
    const idealPercentage = allocation.ideal_percentage;
    const actualPercentage = allocation.actual_percentage;
    const weight = idealPercentage;

    const deviation = Math.abs(actualPercentage - idealPercentage);
    const maxDeviation = Math.max(idealPercentage, 100 - idealPercentage);
    const normalizedDeviation = Math.min(deviation / maxDeviation, 1);
    const categoryScore = (1 - normalizedDeviation) * 100;

    totalScore += categoryScore * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score >= 80) {
    return { stroke: '#22c55e', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  } else if (score >= 60) {
    return { stroke: '#3b82f6', text: 'text-blue-600', bg: 'bg-blue-50' };
  } else if (score >= 40) {
    return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' };
  } else {
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
  }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Atencao';
}

const sizeConfig = {
  sm: { width: 100, strokeWidth: 6, fontSize: 'text-xl', labelSize: 'text-xs' },
  md: { width: 140, strokeWidth: 8, fontSize: 'text-3xl', labelSize: 'text-sm' },
  lg: { width: 180, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
};

export function BudgetHealthScore({
  allocations,
  size = 'md',
  className
}: BudgetHealthScoreProps) {
  const score = useMemo(() => calculateHealthScore(allocations), [allocations]);
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);
  const config = sizeConfig[size];

  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          className="transform -rotate-90"
          width={config.width}
          height={config.width}
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold tabular-nums', config.fontSize, colors.text)}>
            {score}
          </span>
          <span className={cn('text-slate-500', config.labelSize)}>
            pontos
          </span>
        </div>
      </div>

      {/* Label */}
      <div className={cn(
        'mt-3 rounded-full px-3 py-1 font-medium border',
        colors.bg,
        colors.text,
        config.labelSize
      )}>
        {label}
      </div>
    </div>
  );
}
