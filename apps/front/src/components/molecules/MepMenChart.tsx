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
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayTrade, FuturesAsset } from '@/types/daytrade';
import { TICK_VALUES } from '@/types/daytrade';

interface MepMenChartProps {
  trades: DayTrade[];
  assetFilter: FuturesAsset | 'all';
}

export function MepMenChart({ trades, assetFilter }: MepMenChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Filtrar trades com MEP/MEN preenchidos e pelo ativo selecionado
  const tradesWithMepMen = useMemo(() => {
    return trades
      .filter((t) => t.mep !== null || t.men !== null)
      .filter((t) => assetFilter === 'all' || t.asset === assetFilter)
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  }, [trades, assetFilter]);

  // Determinar o ativo predominante para mostrar no título
  const currentAsset = assetFilter !== 'all' ? assetFilter : null;
  const tickValue = currentAsset ? TICK_VALUES[currentAsset] : null;

  // Estatísticas
  const stats = useMemo(() => {
    if (tradesWithMepMen.length === 0) {
      return { avgMep: 0, avgMen: 0, avgResultPoints: 0, efficiency: 0 };
    }

    const mepValues = tradesWithMepMen.filter(t => t.mep !== null).map(t => t.mep!);
    const menValues = tradesWithMepMen.filter(t => t.men !== null).map(t => t.men!);

    // Calcular resultado em pontos (não em R$)
    const resultPointsValues = tradesWithMepMen
      .filter(t => t.exit_price !== null && t.entry_price !== null)
      .map(t => {
        const points = t.direction === 'BUY'
          ? (t.exit_price! - t.entry_price)
          : (t.entry_price - t.exit_price!);
        return points;
      });

    const avgMep = mepValues.length > 0 ? mepValues.reduce((a, b) => a + b, 0) / mepValues.length : 0;
    const avgMen = menValues.length > 0 ? menValues.reduce((a, b) => a + b, 0) / menValues.length : 0;
    const avgResultPoints = resultPointsValues.length > 0 ? resultPointsValues.reduce((a, b) => a + b, 0) / resultPointsValues.length : 0;

    // Eficiência: quanto do MEP você conseguiu capturar em média
    // Se MEP médio é 100 pontos e resultado médio é 50 pontos, eficiência é 50%
    const efficiency = avgMep > 0 ? (avgResultPoints / avgMep) * 100 : 0;

    return { avgMep, avgMen, avgResultPoints, efficiency };
  }, [tradesWithMepMen]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpar gráfico anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Se não tiver dados, não criar gráfico
    if (tradesWithMepMen.length === 0) return;

    // Criar gráfico
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
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        visible: false, // Esconder eixo de tempo pois usamos índice
      },
      handleScroll: false,
      handleScale: false,
    });

    // Usar índice sequencial como "time" para evitar conflitos de timestamp
    // Cada trade terá um índice único baseado no dia (ex: 20240115001, 20240115002)
    const baseTime = 1700000000; // Timestamp base arbitrário

    // Dados para MEP (barras positivas - verde)
    const mepData = tradesWithMepMen
      .filter(t => t.mep !== null)
      .map((trade, index) => ({
        time: (baseTime + index) as any,
        value: trade.mep!,
        color: '#10b981',
      }));

    // Dados para MEN (barras negativas - vermelho)
    const menData = tradesWithMepMen
      .filter(t => t.men !== null)
      .map((trade, index) => ({
        time: (baseTime + index) as any,
        value: -trade.men!, // Negativo para mostrar abaixo
        color: '#ef4444',
      }));

    // Dados para resultado em pontos (onde saiu cada operação)
    const resultData = tradesWithMepMen
      .filter(t => t.exit_price !== null && t.entry_price !== null)
      .map((trade, index) => {
        // Calcular pontos capturados (resultado bruto em pontos)
        const pointsCaptured = trade.direction === 'BUY'
          ? (trade.exit_price! - trade.entry_price)
          : (trade.entry_price - trade.exit_price!);
        return {
          time: (baseTime + index) as any,
          value: pointsCaptured,
        };
      });

    // Criar série de histograma para MEP
    if (mepData.length > 0) {
      const mepSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 1 },
        priceScaleId: 'mep',
      });
      mepSeries.setData(mepData);
    }

    // Criar série de histograma para MEN
    if (menData.length > 0) {
      const menSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 1 },
        priceScaleId: 'mep', // Mesmo scale para comparação
      });
      menSeries.setData(menData);
    }

    // Linha de resultado (onde saiu cada operação)
    if (resultData.length > 0) {
      const resultSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6', // Azul para destacar
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: '#3b82f6',
        crosshairMarkerBackgroundColor: '#ffffff',
        priceScaleId: 'mep',
      });
      resultSeries.setData(resultData);
    }

    // Linha de média MEP
    if (stats.avgMep > 0 && mepData.length >= 2) {
      const avgMepLine = chart.addSeries(LineSeries, {
        color: '#059669',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceScaleId: 'mep',
      });
      avgMepLine.setData([
        { time: mepData[0].time, value: stats.avgMep },
        { time: mepData[mepData.length - 1].time, value: stats.avgMep },
      ]);
    }

    // Linha de média MEN
    if (stats.avgMen > 0 && menData.length >= 2) {
      const avgMenLine = chart.addSeries(LineSeries, {
        color: '#dc2626',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceScaleId: 'mep',
      });
      avgMenLine.setData([
        { time: menData[0].time, value: -stats.avgMen },
        { time: menData[menData.length - 1].time, value: -stats.avgMen },
      ]);
    }

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
  }, [tradesWithMepMen, stats]);

  const formatPoints = (value: number) => `${value.toFixed(1)} pts`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Analise MEP / MEN {currentAsset && `(${currentAsset})`}
        </CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {assetFilter === 'all' ? (
          <div className="flex h-[250px] flex-col items-center justify-center text-sm text-muted-foreground">
            <Target className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p>Selecione um ativo especifico</p>
            <p className="text-xs">MEP/MEN sao medidos em pontos, que tem valores diferentes para cada ativo</p>
          </div>
        ) : tradesWithMepMen.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Nenhum trade com MEP/MEN registrado para {assetFilter}
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="mb-4 grid grid-cols-5 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-500">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">MEP Medio</span>
                </div>
                <div className="text-lg font-bold text-emerald-500">
                  {formatPoints(stats.avgMep)}
                </div>
                {tickValue && (
                  <div className="text-xs text-muted-foreground">
                    R$ {(stats.avgMep * tickValue).toFixed(2)}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <TrendingDown className="h-3 w-3" />
                  <span className="text-xs font-medium">MEN Medio</span>
                </div>
                <div className="text-lg font-bold text-red-500">
                  {formatPoints(stats.avgMen)}
                </div>
                {tickValue && (
                  <div className="text-xs text-muted-foreground">
                    R$ {(stats.avgMen * tickValue).toFixed(2)}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500">
                  <Target className="h-3 w-3" />
                  <span className="text-xs font-medium">Saida Media</span>
                </div>
                <div className={cn(
                  'text-lg font-bold',
                  stats.avgResultPoints >= 0 ? 'text-blue-500' : 'text-red-500'
                )}>
                  {formatPoints(stats.avgResultPoints)}
                </div>
                {tickValue && (
                  <div className="text-xs text-muted-foreground">
                    R$ {(stats.avgResultPoints * tickValue).toFixed(2)}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  Ratio MEP/MEN
                </div>
                <div className={cn(
                  'text-lg font-bold',
                  stats.avgMen > 0 && stats.avgMep / stats.avgMen >= 1.5
                    ? 'text-emerald-500'
                    : stats.avgMen > 0 && stats.avgMep / stats.avgMen >= 1
                    ? 'text-amber-500'
                    : 'text-red-500'
                )}>
                  {stats.avgMen > 0 ? (stats.avgMep / stats.avgMen).toFixed(2) : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  Eficiencia
                </div>
                <div className={cn(
                  'text-lg font-bold',
                  stats.efficiency >= 50
                    ? 'text-emerald-500'
                    : stats.efficiency >= 30
                    ? 'text-amber-500'
                    : 'text-red-500'
                )}>
                  {stats.efficiency.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Gráfico */}
            <div ref={containerRef} className="h-[250px] w-full" />

            {/* Legenda */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-emerald-500"></div>
                <span>MEP (Max. Excursao Positiva)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-red-500"></div>
                <span>MEN (Max. Excursao Negativa)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t-2 border-solid border-blue-500"></div>
                <span>Saida (pontos capturados)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t-2 border-dashed border-emerald-600"></div>
                <span>Media MEP</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t-2 border-dashed border-red-600"></div>
                <span>Media MEN</span>
              </div>
            </div>

            {/* Dicas de interpretação */}
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Como interpretar:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Ratio MEP/MEN ideal:</strong> acima de 1.5 indica bom risco/retorno</li>
                <li><strong>Eficiencia:</strong> quanto do MEP voce esta capturando (ideal acima de 50%)</li>
                <li>Se MEN medio for muito alto, considere ajustar seu stop</li>
                <li>Se eficiencia for baixa, pode estar saindo cedo demais dos trades</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
