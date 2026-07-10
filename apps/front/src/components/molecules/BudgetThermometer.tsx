'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BudgetCategory } from '@/types/finance';
import { BUDGET_CATEGORY_COLORS } from '@/types/finance';

interface BudgetThermometerProps {
  percentage: number;
  category?: BudgetCategory;
  size?: 'xs' | 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: { width: 12, height: 40, bulbRadius: 6, tubeRadius: 4 },
  sm: { width: 20, height: 60, bulbRadius: 10, tubeRadius: 6 },
  md: { width: 32, height: 100, bulbRadius: 16, tubeRadius: 10 },
};

function getGradientColor(percentage: number): { from: string; to: string; fill: string } {
  if (percentage <= 50) {
    return { from: '#3b82f6', to: '#22c55e', fill: '#22c55e' }; // Blue to Green
  } else if (percentage <= 80) {
    return { from: '#22c55e', to: '#22c55e', fill: '#22c55e' }; // Green
  } else if (percentage <= 100) {
    return { from: '#22c55e', to: '#f59e0b', fill: '#f59e0b' }; // Green to Amber
  } else {
    return { from: '#f59e0b', to: '#ef4444', fill: '#ef4444' }; // Amber to Red
  }
}

export function BudgetThermometer({
  percentage,
  category,
  size = 'sm',
  showLabels = false,
  className,
}: BudgetThermometerProps) {
  const config = sizeConfig[size];
  const gradientId = `thermometer-gradient-${category || 'default'}-${size}`;

  const { fillHeight, colors } = useMemo(() => {
    // Clamp percentage between 0 and 120 for display
    const displayPercentage = Math.min(Math.max(percentage, 0), 120);

    // Calculate fill height (tube area only, not bulb)
    const tubeHeight = config.height - config.bulbRadius * 2;
    const fillHeight = (displayPercentage / 120) * tubeHeight;

    return {
      fillHeight,
      colors: getGradientColor(percentage),
    };
  }, [percentage, config]);

  // SVG dimensions
  const svgWidth = config.width + (showLabels ? 30 : 0);
  const svgHeight = config.height + config.bulbRadius;

  // Positions
  const tubeX = showLabels ? 25 : config.width / 2;
  const tubeTop = config.tubeRadius;
  const tubeBottom = config.height - config.bulbRadius;
  const bulbY = config.height;

  // Use category color if provided
  const fillColor = category ? BUDGET_CATEGORY_COLORS[category] : colors.fill;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        <defs>
          {/* Gradient for fill */}
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>

          {/* Clip path for tube */}
          <clipPath id={`tube-clip-${gradientId}`}>
            <rect
              x={tubeX - config.tubeRadius}
              y={tubeTop}
              width={config.tubeRadius * 2}
              height={tubeBottom - tubeTop}
              rx={config.tubeRadius}
            />
            <circle cx={tubeX} cy={bulbY} r={config.bulbRadius} />
          </clipPath>
        </defs>

        {/* Background tube and bulb */}
        <rect
          x={tubeX - config.tubeRadius}
          y={tubeTop}
          width={config.tubeRadius * 2}
          height={tubeBottom - tubeTop}
          rx={config.tubeRadius}
          fill="#f1f5f9"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <circle
          cx={tubeX}
          cy={bulbY}
          r={config.bulbRadius}
          fill="#f1f5f9"
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Filled portion */}
        <g clipPath={`url(#tube-clip-${gradientId})`}>
          {/* Bulb fill (always filled) */}
          <circle
            cx={tubeX}
            cy={bulbY}
            r={config.bulbRadius - 1}
            fill={fillColor}
            className="transition-all duration-500"
          />

          {/* Tube fill */}
          <rect
            x={tubeX - config.tubeRadius + 1}
            y={tubeBottom - fillHeight}
            width={(config.tubeRadius - 1) * 2}
            height={fillHeight + config.bulbRadius}
            fill={fillColor}
            className="transition-all duration-700 ease-out"
          />
        </g>

        {/* Markers */}
        {showLabels && (
          <>
            {/* 50% marker */}
            <line
              x1={tubeX - config.tubeRadius - 3}
              y1={tubeBottom - ((50 / 120) * (tubeBottom - tubeTop))}
              x2={tubeX - config.tubeRadius}
              y2={tubeBottom - ((50 / 120) * (tubeBottom - tubeTop))}
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <text
              x={tubeX - config.tubeRadius - 5}
              y={tubeBottom - ((50 / 120) * (tubeBottom - tubeTop)) + 3}
              textAnchor="end"
              className="text-[8px] fill-slate-400"
            >
              50%
            </text>

            {/* 80% marker */}
            <line
              x1={tubeX - config.tubeRadius - 3}
              y1={tubeBottom - ((80 / 120) * (tubeBottom - tubeTop))}
              x2={tubeX - config.tubeRadius}
              y2={tubeBottom - ((80 / 120) * (tubeBottom - tubeTop))}
              stroke="#f59e0b"
              strokeWidth={1}
            />
            <text
              x={tubeX - config.tubeRadius - 5}
              y={tubeBottom - ((80 / 120) * (tubeBottom - tubeTop)) + 3}
              textAnchor="end"
              className="text-[8px] fill-amber-500"
            >
              80%
            </text>

            {/* 100% marker */}
            <line
              x1={tubeX - config.tubeRadius - 3}
              y1={tubeBottom - ((100 / 120) * (tubeBottom - tubeTop))}
              x2={tubeX - config.tubeRadius}
              y2={tubeBottom - ((100 / 120) * (tubeBottom - tubeTop))}
              stroke="#ef4444"
              strokeWidth={1}
            />
            <text
              x={tubeX - config.tubeRadius - 5}
              y={tubeBottom - ((100 / 120) * (tubeBottom - tubeTop)) + 3}
              textAnchor="end"
              className="text-[8px] fill-red-500"
            >
              100%
            </text>
          </>
        )}

        {/* Percentage label inside bulb (for md size) */}
        {size === 'md' && (
          <text
            x={tubeX}
            y={bulbY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] font-bold fill-white"
          >
            {Math.round(percentage)}%
          </text>
        )}
      </svg>
    </div>
  );
}

// Mini version for use in cards
export function MiniThermometer({
  percentage,
  category,
  className,
}: {
  percentage: number;
  category?: BudgetCategory;
  className?: string;
}) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 120);
  const fillHeight = (clampedPercentage / 120) * 100;

  const getColor = () => {
    if (percentage <= 80) return '#22c55e';
    if (percentage <= 100) return '#f59e0b';
    return '#ef4444';
  };

  const color = category ? BUDGET_CATEGORY_COLORS[category] : getColor();

  return (
    <div
      className={cn(
        'relative h-8 w-2 rounded-full bg-slate-100 overflow-hidden',
        className
      )}
    >
      <div
        className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500"
        style={{
          height: `${fillHeight}%`,
          backgroundColor: getColor(),
        }}
      />
      {/* 100% marker */}
      <div
        className="absolute left-0 right-0 h-px bg-red-400"
        style={{ bottom: `${(100 / 120) * 100}%` }}
      />
    </div>
  );
}
