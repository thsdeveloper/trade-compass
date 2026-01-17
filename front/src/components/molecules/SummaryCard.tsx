'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/types/finance';
import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    card: 'bg-gradient-to-br from-slate-50 to-white border-slate-200',
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
    positive: 'text-slate-900',
    negative: 'text-red-600',
  },
  success: {
    card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-600',
    positive: 'text-emerald-600',
    negative: 'text-emerald-600',
  },
  danger: {
    card: 'bg-gradient-to-br from-red-50 to-white border-red-100',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-600',
    positive: 'text-red-600',
    negative: 'text-red-600',
  },
};

const gradientOrbs = {
  default: 'linear-gradient(135deg, #64748b, #94a3b8)',
  success: 'linear-gradient(135deg, #10b981, #34d399)',
  danger: 'linear-gradient(135deg, #ef4444, #f87171)',
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: SummaryCardProps) {
  const styles = variantStyles[variant];
  const isNegative = value < 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 transition-all',
        'hover:shadow-md hover:shadow-slate-200/50',
        styles.card,
        className
      )}
    >
      {/* Decorative gradient orb */}
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: gradientOrbs[variant] }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                styles.icon
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-3">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums tracking-tight',
              variant === 'default'
                ? isNegative
                  ? styles.negative
                  : styles.positive
                : styles.value
            )}
          >
            {formatCurrency(value)}
          </span>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
