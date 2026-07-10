'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, Target, X, ArrowRight } from 'lucide-react';
import type {
  DayTradeWithExits,
  ActualExit,
  PlannedExit,
} from '@/types/daytrade';
import {
  EXIT_TYPE_LABELS,
  EXIT_TYPE_COLORS,
  calculateTradeExitMetrics,
} from '@/types/daytrade';

interface ExitTimelineProps {
  trade: DayTradeWithExits;
  compact?: boolean;
}

interface TimelineEntry {
  type: 'entry' | 'exit';
  time: string;
  price: number;
  contracts: number;
  exitType?: string;
  result?: number;
  points?: number;
  matched?: boolean; // Se foi matched com plano
  actualExit?: ActualExit;
}

export function ExitTimeline({ trade, compact = false }: ExitTimelineProps) {
  // Construir timeline de eventos
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Entrada
    entries.push({
      type: 'entry',
      time: trade.entry_time,
      price: trade.entry_price,
      contracts: trade.contracts,
    });

    // Saidas reais ordenadas por tempo
    const sortedExits = [...trade.actual_exits].sort(
      (a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime()
    );

    for (const exit of sortedExits) {
      entries.push({
        type: 'exit',
        time: exit.exit_time,
        price: exit.price,
        contracts: exit.contracts,
        exitType: exit.exit_type,
        result: exit.result,
        points: exit.points,
        matched: !!exit.planned_exit_id,
        actualExit: exit,
      });
    }

    return entries;
  }, [trade]);

  // Metricas calculadas
  const metrics = useMemo(() => {
    return calculateTradeExitMetrics(trade, trade.entry_price);
  }, [trade]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (trade.actual_exits.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 py-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          Nenhuma saida registrada
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        {timeline
          .filter((e) => e.type === 'exit')
          .map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: entry.exitType
                      ? EXIT_TYPE_COLORS[entry.exitType as keyof typeof EXIT_TYPE_COLORS]
                      : '#888',
                  }}
                />
                <span className="text-muted-foreground">
                  {formatTime(entry.time)}
                </span>
                <span className="font-medium">
                  {entry.exitType
                    ? EXIT_TYPE_LABELS[entry.exitType as keyof typeof EXIT_TYPE_LABELS]
                    : ''}
                </span>
                <span className="text-muted-foreground">x{entry.contracts}</span>
              </div>
              <span
                className={cn(
                  'font-mono font-medium tabular-nums',
                  (entry.result ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {(entry.result ?? 0) >= 0 ? '+' : ''}
                {formatCurrency(entry.result ?? 0)}
              </span>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline visual */}
      <div className="relative space-y-0">
        {timeline.map((entry, index) => (
          <div key={index} className="relative flex items-start gap-3">
            {/* Linha conectora */}
            {index < timeline.length - 1 && (
              <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
            )}

            {/* Icone */}
            <div
              className={cn(
                'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2',
                entry.type === 'entry'
                  ? 'border-primary bg-primary/10'
                  : entry.matched
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-amber-500 bg-amber-50'
              )}
            >
              {entry.type === 'entry' ? (
                <ArrowRight className="h-3 w-3 text-primary" />
              ) : entry.matched ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Clock className="h-3 w-3 text-amber-600" />
              )}
            </div>

            {/* Conteudo */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {formatTime(entry.time)}
                  </span>
                  {entry.type === 'entry' ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      ENTRADA
                    </span>
                  ) : (
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor:
                          entry.exitType
                            ? `${EXIT_TYPE_COLORS[entry.exitType as keyof typeof EXIT_TYPE_COLORS]}20`
                            : '#88888820',
                        color: entry.exitType
                          ? EXIT_TYPE_COLORS[entry.exitType as keyof typeof EXIT_TYPE_COLORS]
                          : '#888',
                      }}
                    >
                      {entry.exitType
                        ? EXIT_TYPE_LABELS[entry.exitType as keyof typeof EXIT_TYPE_LABELS]
                        : 'SAIDA'}
                    </span>
                  )}
                  {entry.matched && (
                    <span className="text-[10px] text-emerald-600">[matched]</span>
                  )}
                  {entry.type === 'exit' && !entry.matched && (
                    <span className="text-[10px] text-amber-600">
                      [nao planejado]
                    </span>
                  )}
                </div>

                {entry.type === 'exit' && (
                  <span
                    className={cn(
                      'font-mono text-[13px] font-semibold tabular-nums',
                      (entry.result ?? 0) >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    )}
                  >
                    {(entry.result ?? 0) >= 0 ? '+' : ''}
                    {formatCurrency(entry.result ?? 0)}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-3 text-[12px]">
                <span className="font-mono tabular-nums">
                  {formatPrice(entry.price)}
                </span>
                <span className="text-muted-foreground">
                  x{entry.contracts} cts
                </span>
                {entry.type === 'exit' && entry.points !== undefined && (
                  <span
                    className={cn(
                      'font-mono tabular-nums',
                      entry.points >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {entry.points >= 0 ? '+' : ''}
                    {entry.points.toFixed(0)} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span
              className={cn(
                'font-mono font-semibold tabular-nums',
                metrics.total_result >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {metrics.total_result >= 0 ? '+' : ''}
              {formatCurrency(metrics.total_result)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Preco medio:</span>
            <span className="font-mono tabular-nums">
              {formatPrice(metrics.average_exit_price)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Aderencia:</span>
            <span
              className={cn(
                'font-medium tabular-nums',
                metrics.plan_adherence_score >= 80
                  ? 'text-emerald-600'
                  : metrics.plan_adherence_score >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
              )}
            >
              {metrics.plan_adherence_score.toFixed(0)}%
            </span>
          </div>

          {metrics.remaining_contracts > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Restante:</span>
              <span className="font-medium tabular-nums text-amber-600">
                {metrics.remaining_contracts} cts
              </span>
            </div>
          )}

          {trade.mep !== null && metrics.points_left_on_table > 0 && (
            <div className="col-span-2 flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">
                Pontos deixados na mesa:
              </span>
              <span className="font-mono tabular-nums text-amber-600">
                {metrics.points_left_on_table.toFixed(0)} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
