'use client';

import { useState } from 'react';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SetupChartModal } from '@/components/organisms/SetupChartModal';
import type { Setup, SetupStatus, RiskLevel } from '@/types/market';
import { cn } from '@/lib/utils';
import { Target, ShieldAlert, Percent, AlertTriangle, Zap, LineChart } from 'lucide-react';

interface SetupCardProps {
  setup: Setup;
  ticker: string;
}

const statusConfig: Record<
  SetupStatus,
  { label: string; className: string }
> = {
  ATIVO: {
    label: 'Ativo',
    className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  EM_FORMACAO: {
    label: 'Em Formacao',
    className: 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
  INVALIDO: {
    label: 'Invalido',
    className: 'bg-zinc-500/20 text-zinc-600 border-zinc-500/30 dark:text-zinc-400',
  },
};

const riskConfig: Record<RiskLevel, { className: string }> = {
  Baixo: { className: 'text-emerald-600 dark:text-emerald-400' },
  Moderado: { className: 'text-amber-600 dark:text-amber-400' },
  Alto: { className: 'text-red-600 dark:text-red-400' },
};

export function SetupCard({ setup, ticker }: SetupCardProps) {
  const [chartOpen, setChartOpen] = useState(false);
  const status = statusConfig[setup.status];
  const risk = riskConfig[setup.risk];

  return (
    <>
      <SetupChartModal
        setup={setup}
        ticker={ticker}
        open={chartOpen}
        onOpenChange={setChartOpen}
      />
      <AccordionItem value={setup.id} className="border rounded-lg px-4 mb-3">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-1 items-center justify-between pr-4">
          <div className="flex flex-col items-start gap-1 text-left">
            <span className="font-semibold">{setup.title}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(status.className, 'text-xs')}>
                {status.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Taxa: {setup.successRate}%
              </span>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-4">
          {/* Explicacao */}
          <p className="text-muted-foreground">{setup.explanation}</p>

          {/* Grid de informacoes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Risco */}
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Nivel de Risco
                </p>
                <p className={cn('font-semibold', risk.className)}>
                  {setup.risk}
                </p>
              </div>
            </div>

            {/* Taxa de Sucesso */}
            <div className="flex items-start gap-2">
              <Percent className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Taxa de Sucesso Historica
                </p>
                <p className="font-semibold">{setup.successRate}%</p>
              </div>
            </div>

            {/* Stop Sugerido */}
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Stop Sugerido
                </p>
                <p className="text-sm">{setup.stopSuggestion}</p>
              </div>
            </div>

            {/* Alvo */}
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Nota sobre Alvo
                </p>
                <p className="text-sm">{setup.targetNote}</p>
              </div>
            </div>
          </div>

          {/* Sinais */}
          {setup.signals && setup.signals.length > 0 && (
            <div className="flex items-start gap-2 pt-2 border-t">
              <Zap className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Sinais Detectados
                </p>
                <ul className="space-y-1">
                  {setup.signals.map((signal, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-1">
                      <span className="text-amber-500">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Botao Ver Grafico */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setChartOpen(true)}
            >
              <LineChart className="h-4 w-4 mr-2" />
              Ver Grafico
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
    </>
  );
}
