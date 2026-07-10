'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayTrade, FuturesAsset } from '@/types/daytrade';

interface TradePlanChartProps {
  trades: DayTrade[];
  assetFilter: FuturesAsset | 'all';
}

export function TradePlanChart({ trades, assetFilter }: TradePlanChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Filtrar trades com plano definido (stop ou alvo)
  const tradesComPlano = useMemo(() => {
    return trades
      .filter(
        (t) =>
          (t.stop_price !== null || t.target_price !== null) &&
          t.exit_price !== null
      )
      .filter((t) => assetFilter === 'all' || t.asset === assetFilter)
      .sort(
        (a, b) =>
          new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
      );
  }, [trades, assetFilter]);

  // Estatisticas do plano
  const planStats = useMemo(() => {
    if (tradesComPlano.length === 0) {
      return { avgPlanRR: 0, avgExecutedRR: 0, planEfficiency: 0 };
    }

    const tradesComRR = tradesComPlano.filter(
      (t) => t.stop_price !== null && t.target_price !== null
    );

    if (tradesComRR.length === 0) {
      return { avgPlanRR: 0, avgExecutedRR: 0, planEfficiency: 0 };
    }

    // RR Planejado medio
    const planRRs = tradesComRR.map((t) => {
      const risco = Math.abs(t.entry_price - t.stop_price!);
      const retorno = Math.abs(t.target_price! - t.entry_price);
      return risco > 0 ? retorno / risco : 0;
    });
    const avgPlanRR =
      planRRs.reduce((a, b) => a + b, 0) / planRRs.length;

    // RR Executado medio
    const execRRs = tradesComRR.map((t) => {
      const risco = Math.abs(t.entry_price - t.stop_price!);
      const retornoExec =
        t.direction === 'BUY'
          ? t.exit_price! - t.entry_price
          : t.entry_price - t.exit_price!;
      return risco > 0 ? retornoExec / risco : 0;
    });
    const avgExecutedRR =
      execRRs.reduce((a, b) => a + b, 0) / execRRs.length;

    // Eficiencia: quanto do alvo planejado foi capturado (apenas trades vencedores)
    const tradesVencedores = tradesComRR.filter(
      (t) => t.result !== null && t.result > 0
    );
    let planEfficiency = 0;
    if (tradesVencedores.length > 0) {
      const efficiencies = tradesVencedores.map((t) => {
        const alvoDistance = Math.abs(t.target_price! - t.entry_price);
        const exitDistance =
          t.direction === 'BUY'
            ? t.exit_price! - t.entry_price
            : t.entry_price - t.exit_price!;
        return alvoDistance > 0 ? (exitDistance / alvoDistance) * 100 : 0;
      });
      planEfficiency =
        efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    }

    return { avgPlanRR, avgExecutedRR, planEfficiency };
  }, [tradesComPlano]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (tradesComPlano.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#e5e7eb', style: LineStyle.Dotted },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, visible: false },
      handleScroll: false,
      handleScale: false,
    });

    const baseTime = 1700000000;

    // Dados para alvo planejado (barras verdes)
    const targetData = tradesComPlano
      .filter((t) => t.target_price !== null)
      .map((t, i) => {
        const targetPoints =
          t.direction === 'BUY'
            ? t.target_price! - t.entry_price
            : t.entry_price - t.target_price!;
        return { time: (baseTime + i) as any, value: targetPoints, color: '#10b981' };
      });

    // Dados para stop planejado (barras vermelhas, negativo)
    const stopData = tradesComPlano
      .filter((t) => t.stop_price !== null)
      .map((t, i) => {
        const stopPoints =
          t.direction === 'BUY'
            ? t.entry_price - t.stop_price!
            : t.stop_price! - t.entry_price;
        return { time: (baseTime + i) as any, value: -stopPoints, color: '#ef4444' };
      });

    // Dados para saida real (linha azul)
    const exitData = tradesComPlano.map((t, i) => {
      const exitPoints =
        t.direction === 'BUY'
          ? t.exit_price! - t.entry_price
          : t.entry_price - t.exit_price!;
      return { time: (baseTime + i) as any, value: exitPoints };
    });

    // Serie de alvo
    if (targetData.length > 0) {
      const targetSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 1 },
        priceScaleId: 'plan',
      });
      targetSeries.setData(targetData);
    }

    // Serie de stop
    if (stopData.length > 0) {
      const stopSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 1 },
        priceScaleId: 'plan',
      });
      stopSeries.setData(stopData);
    }

    // Serie de saida real
    if (exitData.length > 0) {
      const exitSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        priceScaleId: 'plan',
      });
      exitSeries.setData(exitData);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [tradesComPlano]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Plano vs Execucao</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {tradesComPlano.length === 0 ? (
          <div className="flex h-[250px] flex-col items-center justify-center text-sm text-muted-foreground">
            <Target className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p>Nenhum trade com plano definido</p>
            <p className="text-xs">Defina stop e/ou alvo nos seus trades</p>
          </div>
        ) : (
          <>
            {/* Estatisticas */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  R:R Planejado
                </div>
                <div className="text-lg font-bold text-emerald-500">
                  1:{planStats.avgPlanRR.toFixed(1)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  R:R Executado
                </div>
                <div
                  className={cn(
                    'text-lg font-bold',
                    planStats.avgExecutedRR >= 0 ? 'text-blue-500' : 'text-red-500'
                  )}
                >
                  {planStats.avgExecutedRR >= 0 ? '' : '-'}1:
                  {Math.abs(planStats.avgExecutedRR).toFixed(1)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  Captura do Alvo
                </div>
                <div
                  className={cn(
                    'text-lg font-bold',
                    planStats.planEfficiency >= 80
                      ? 'text-emerald-500'
                      : planStats.planEfficiency >= 50
                      ? 'text-amber-500'
                      : 'text-red-500'
                  )}
                >
                  {planStats.planEfficiency.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Grafico */}
            <div ref={containerRef} className="h-[250px] w-full" />

            {/* Legenda */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-emerald-500"></div>
                <span>Alvo planejado (pts)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-red-500"></div>
                <span>Stop planejado (pts)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 bg-blue-500"></div>
                <span>Saida real (pts)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
