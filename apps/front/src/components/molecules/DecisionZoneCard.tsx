import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoneBadge } from '@/components/atoms/ZoneBadge';
import type { DecisionZoneResult } from '@/types/market';
import { Compass, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionZoneCardProps {
  result: DecisionZoneResult;
}

const zoneBorderColors = {
  FAVORAVEL: 'border-l-emerald-500',
  NEUTRA: 'border-l-amber-500',
  RISCO: 'border-l-red-500',
};

export function DecisionZoneCard({ result }: DecisionZoneCardProps) {
  return (
    <Card className={cn('border-l-4', zoneBorderColors[result.zone])}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Zona de Decisao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <ZoneBadge zone={result.zone} size="lg" />
        </div>
        <div className="flex gap-2 rounded-lg bg-muted/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
