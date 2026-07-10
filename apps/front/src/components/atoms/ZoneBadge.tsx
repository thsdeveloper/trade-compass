import { Badge } from '@/components/ui/badge';
import type { DecisionZone } from '@/types/market';
import { cn } from '@/lib/utils';

interface ZoneBadgeProps {
  zone: DecisionZone;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const zoneConfig: Record<
  DecisionZone,
  { label: string; icon: string; className: string }
> = {
  FAVORAVEL: {
    label: 'Zona Favoravel',
    icon: '●',
    className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  NEUTRA: {
    label: 'Zona Neutra',
    icon: '●',
    className: 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  RISCO: {
    label: 'Zona de Risco',
    icon: '●',
    className: 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function ZoneBadge({ zone, size = 'md', showIcon = true }: ZoneBadgeProps) {
  const config = zoneConfig[zone];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, sizeClasses[size], 'font-medium')}
    >
      {showIcon && <span className="mr-1.5">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
