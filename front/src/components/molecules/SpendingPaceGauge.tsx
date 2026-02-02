'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BudgetAllocation, BudgetCategory } from '@/types/finance';
import {
  formatCurrency,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_LABELS,
} from '@/types/finance';

interface SpendingPaceGaugeProps {
  allocation: BudgetAllocation;
  totalIncome: number;
  daysElapsed: number;
  daysInMonth: number;
  className?: string;
}

function getStatusInfo(pacePercentage: number): {
  color: string;
  label: string;
  zone: 'safe' | 'warning' | 'danger';
} {
  if (pacePercentage <= 80) {
    return { color: '#22c55e', label: 'No ritmo', zone: 'safe' };
  } else if (pacePercentage <= 100) {
    return { color: '#f59e0b', label: 'Atencao', zone: 'warning' };
  } else {
    return { color: '#ef4444', label: 'Acima', zone: 'danger' };
  }
}

export function SpendingPaceGauge({
  allocation,
  totalIncome,
  daysElapsed,
  daysInMonth,
  className,
}: SpendingPaceGaugeProps) {
  const categoryColor = BUDGET_CATEGORY_COLORS[allocation.category];
  const categoryLabel = BUDGET_CATEGORY_LABELS[allocation.category];

  const calculations = useMemo(() => {
    const idealAmount = (totalIncome * allocation.ideal_percentage) / 100;
    const idealDaily = idealAmount / daysInMonth;
    const idealSpentSoFar = idealDaily * daysElapsed;

    const actualDaily = daysElapsed > 0 ? allocation.actual_amount / daysElapsed : 0;

    // Pace percentage: how much spent vs how much should have been spent by now
    const pacePercentage = idealSpentSoFar > 0
      ? (allocation.actual_amount / idealSpentSoFar) * 100
      : 0;

    return {
      idealAmount,
      idealDaily,
      idealSpentSoFar,
      actualDaily,
      pacePercentage,
    };
  }, [allocation, totalIncome, daysElapsed, daysInMonth]);

  const status = getStatusInfo(calculations.pacePercentage);

  // SVG configuration for semi-circular gauge
  const width = 160;
  const height = 100;
  const strokeWidth = 12;
  const radius = 60;
  const centerX = width / 2;
  const centerY = height - 10;

  // Arc calculations (semi-circle from -180 to 0 degrees)
  const startAngle = -180;
  const endAngle = 0;
  const angleRange = endAngle - startAngle;

  // Clamp pace percentage for display (max 150% to keep needle visible)
  const displayPace = Math.min(calculations.pacePercentage, 150);
  const needleAngle = startAngle + (displayPace / 150) * angleRange;

  // Convert angle to radians
  const toRadians = (angle: number) => (angle * Math.PI) / 180;

  // Arc path helper
  const describeArc = (startDeg: number, endDeg: number, r: number) => {
    const start = {
      x: centerX + r * Math.cos(toRadians(startDeg)),
      y: centerY + r * Math.sin(toRadians(startDeg)),
    };
    const end = {
      x: centerX + r * Math.cos(toRadians(endDeg)),
      y: centerY + r * Math.sin(toRadians(endDeg)),
    };
    const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Zone angles (0-80% = green, 80-100% = yellow, 100-150% = red)
  const greenEnd = startAngle + (80 / 150) * angleRange;
  const yellowEnd = startAngle + (100 / 150) * angleRange;

  // Needle endpoint
  const needleLength = radius - 15;
  const needleX = centerX + needleLength * Math.cos(toRadians(needleAngle));
  const needleY = centerY + needleLength * Math.sin(toRadians(needleAngle));

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Category label */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="text-sm font-medium text-slate-700">{categoryLabel}</span>
      </div>

      {/* Gauge SVG */}
      <svg width={width} height={height} className="overflow-visible">
        {/* Background arc (gray) */}
        <path
          d={describeArc(startAngle, endAngle, radius)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Green zone (0-80%) */}
        <path
          d={describeArc(startAngle, greenEnd, radius)}
          fill="none"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Yellow zone (80-100%) */}
        <path
          d={describeArc(greenEnd, yellowEnd, radius)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />

        {/* Red zone (100-150%) */}
        <path
          d={describeArc(yellowEnd, endAngle, radius)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Active progress arc */}
        <path
          d={describeArc(startAngle, needleAngle, radius)}
          fill="none"
          stroke={status.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={status.color}
          strokeWidth={3}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Needle center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          fill={status.color}
          className="transition-all duration-700 ease-out"
        />

        {/* Zone markers */}
        <text x={8} y={centerY - 5} className="text-[10px] fill-slate-400">
          0%
        </text>
        <text x={width - 24} y={centerY - 5} className="text-[10px] fill-slate-400">
          150%
        </text>
        <text x={centerX - 8} y={15} className="text-[10px] fill-slate-400">
          80%
        </text>
      </svg>

      {/* Center info */}
      <div className="text-center -mt-2">
        <div className="text-2xl font-bold tabular-nums" style={{ color: status.color }}>
          {calculations.pacePercentage.toFixed(0)}%
        </div>
        <div
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full mt-1',
            status.zone === 'safe' && 'bg-emerald-50 text-emerald-700',
            status.zone === 'warning' && 'bg-amber-50 text-amber-700',
            status.zone === 'danger' && 'bg-red-50 text-red-700'
          )}
        >
          {status.label}
        </div>
      </div>

      {/* Daily averages */}
      <div className="mt-3 w-full space-y-1 px-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Media diaria ideal:</span>
          <span className="font-medium text-slate-700 tabular-nums">
            {formatCurrency(calculations.idealDaily)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Media diaria atual:</span>
          <span
            className="font-medium tabular-nums"
            style={{ color: status.color }}
          >
            {formatCurrency(calculations.actualDaily)}
          </span>
        </div>
      </div>
    </div>
  );
}
