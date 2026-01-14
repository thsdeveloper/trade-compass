'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  AreaSeries,
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayTrade } from '@/types/daytrade';

interface DayTradeEvolutionChartProps {
  trades: DayTrade[];
}

export function DayTradeEvolutionChart({ trades }: DayTradeEvolutionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Calcular dados do gráfico (evolução acumulada)
  const chartData = useMemo(() => {
    // Filtrar trades finalizados e ordenar por horário de entrada
    const completedTrades = trades
      .filter((t) => t.result !== null && t.exit_time !== null)
      .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime());

    if (completedTrades.length === 0) {
      return [];
    }

    // Usar índice sequencial para evitar conflitos de timestamp duplicados
    const baseTime = 1700000000;

    // Calcular P&L acumulado
    let accumulated = 0;
    const data = completedTrades.map((trade, index) => {
      accumulated += trade.result || 0;
      return {
        time: (baseTime + index + 1) as any,
        value: accumulated,
      };
    });

    // Adicionar ponto inicial (zero)
    return [
      { time: baseTime as any, value: 0 },
      ...data,
    ];
  }, [trades]);

  // Estatísticas do dia
  const stats = useMemo(() => {
    const completedTrades = trades.filter((t) => t.result !== null);
    const totalResult = completedTrades.reduce((sum, t) => sum + (t.result || 0), 0);
    const maxProfit = completedTrades.length > 0
      ? Math.max(...completedTrades.map(t => t.result || 0))
      : 0;
    const maxLoss = completedTrades.length > 0
      ? Math.min(...completedTrades.map(t => t.result || 0))
      : 0;

    return { totalResult, maxProfit, maxLoss, totalTrades: completedTrades.length };
  }, [trades]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpar gráfico anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Se não tiver dados, não criar gráfico
    if (chartData.length === 0) return;

    const isPositive = stats.totalResult >= 0;

    // Criar gráfico
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#e5e7eb', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { visible: false },
        horzLine: { color: '#9ca3af', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        visible: false, // Esconder eixo de tempo pois usamos índice sequencial
      },
      handleScroll: false,
      handleScale: false,
    });

    // Criar série de área
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: isPositive ? '#10b981' : '#ef4444',
      topColor: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      bottomColor: isPositive ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    areaSeries.setData(chartData);

    // Adicionar linha zero
    areaSeries.createPriceLine({
      price: 0,
      color: '#9ca3af',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

    // Ajustar visualização
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        chartRef.current.applyOptions({
          width: entries[0].contentRect.width,
        });
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
  }, [chartData, stats.totalResult]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isPositive = stats.totalResult >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Evolucao do Dia</CardTitle>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Nenhum trade finalizado
          </div>
        ) : (
          <>
            {/* Valor atual */}
            <div className="mb-4">
              <div
                className={cn(
                  'text-2xl font-bold',
                  isPositive ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {formatCurrency(stats.totalResult)}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Maior ganho:{' '}
                  <span className="text-emerald-500">
                    {formatCurrency(stats.maxProfit)}
                  </span>
                </span>
                <span>
                  Maior perda:{' '}
                  <span className="text-red-500">
                    {formatCurrency(stats.maxLoss)}
                  </span>
                </span>
              </div>
            </div>

            {/* Gráfico */}
            <div ref={containerRef} className="h-[200px] w-full" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
