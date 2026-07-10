import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AssetContext } from '@/types/market';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextCardsProps {
  context: AssetContext;
}

export function ContextCards({ context }: ContextCardsProps) {
  const trendConfig = {
    Alta: {
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    Baixa: {
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
    },
    Lateral: {
      icon: Minus,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
  };

  const volumeConfig = {
    Acima: { color: 'text-emerald-600 dark:text-emerald-400' },
    Normal: { color: 'text-muted-foreground' },
    Abaixo: { color: 'text-red-600 dark:text-red-400' },
  };

  const volatilityConfig = {
    Alta: { color: 'text-red-600 dark:text-red-400' },
    Media: { color: 'text-amber-600 dark:text-amber-400' },
    Baixa: { color: 'text-emerald-600 dark:text-emerald-400' },
  };

  const trend = trendConfig[context.trend];
  const TrendIcon = trend.icon;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Tendencia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tendencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', trend.bg)}>
              <TrendIcon className={cn('h-5 w-5', trend.color)} />
            </div>
            <span className={cn('text-xl font-semibold', trend.color)}>
              {context.trend}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Volume */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <span
              className={cn(
                'text-xl font-semibold',
                volumeConfig[context.volume].color
              )}
            >
              {context.volume}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Volatilidade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Volatilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <span
              className={cn(
                'text-xl font-semibold',
                volatilityConfig[context.volatility].color
              )}
            >
              {context.volatility}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
