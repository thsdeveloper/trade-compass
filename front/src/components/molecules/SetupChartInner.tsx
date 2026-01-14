'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
  Time,
  SeriesMarker,
} from 'lightweight-charts';
import type { Setup, HistoricalSignal, SignalStatus } from '@/types/market';

interface ChartDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema8: number | null;
  ema80: number | null;
  macdHistogram: number | null;
}

interface SetupChartInnerProps {
  data: ChartDataPoint[];
  width: number;
  height: number;
  setup: Setup;
  ticker: string;
  showMysticPulse?: boolean;
  historicalSignals?: HistoricalSignal[];
}

// Tema do gráfico (light)
const theme = {
  background: '#ffffff',
  textColor: '#333',
  gridColor: '#e5e5e5',
  candleUp: '#22c55e',
  candleDown: '#ef4444',
  volumeUp: 'rgba(34, 197, 94, 0.4)',
  volumeDown: 'rgba(239, 68, 68, 0.4)',
  ema8: '#2563eb',
  ema80: '#d97706',
  stopLoss: '#dc2626',
  entry: '#16a34a',
  takeProfit: '#2563eb',
  crosshair: '#9ca3af',
  // Cores para destacar candles do setup 123
  setupCandle: '#9333ea', // Roxo para candles do setup
  setupCandleBorder: '#7c3aed',
  // Cores para sinais historicos por status
  signalSuccess: '#22c55e',   // Verde - sucesso
  signalFailure: '#ef4444',   // Vermelho - falha
  signalPending: '#eab308',   // Amarelo - pendente
  signalExpired: '#9ca3af',   // Cinza - expirado
  // MACD
  macdPositive: '#22c55e',    // Verde para histograma positivo
  macdNegative: '#ef4444',    // Vermelho para histograma negativo
};

// Mapeia status para cor
const getSignalColor = (status: SignalStatus): string => {
  switch (status) {
    case 'success': return theme.signalSuccess;
    case 'failure': return theme.signalFailure;
    case 'pending': return theme.signalPending;
    case 'expired': return theme.signalExpired;
    default: return theme.signalPending;
  }
};

export function SetupChartInner({
  data,
  width,
  height,
  setup,
  historicalSignals = [],
}: SetupChartInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0 || width <= 0 || height <= 0) {
      return;
    }

    // Limpar gráfico anterior
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Criar gráfico
    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: theme.crosshair, width: 1, style: LineStyle.Dashed },
        horzLine: { color: theme.crosshair, width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: theme.gridColor,
      },
      timeScale: {
        borderColor: theme.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Índices dos candles do setup 123 (3 candles consecutivos)
    // Os índices do backend são baseados em 300 candles, mas o frontend usa mais
    // Precisamos converter usando offset relativo ao fim do array
    const setupIndices = new Set<number>();
    const BACKEND_CANDLE_COUNT = 300; // Número de candles que o backend usa
    const frontendCount = data.length;
    const indexOffset = frontendCount - BACKEND_CANDLE_COUNT;

    if (setup.meta.p1Index !== undefined) {
      const adjustedIndex = setup.meta.p1Index + indexOffset;
      if (adjustedIndex >= 0 && adjustedIndex < frontendCount) {
        setupIndices.add(adjustedIndex);
      }
    }
    if (setup.meta.p2Index !== undefined) {
      const adjustedIndex = setup.meta.p2Index + indexOffset;
      if (adjustedIndex >= 0 && adjustedIndex < frontendCount) {
        setupIndices.add(adjustedIndex);
      }
    }
    if (setup.meta.p3Index !== undefined) {
      const adjustedIndex = setup.meta.p3Index + indexOffset;
      if (adjustedIndex >= 0 && adjustedIndex < frontendCount) {
        setupIndices.add(adjustedIndex);
      }
    }

    // Formatar dados para candlestick (com cores especiais para setup 123)
    const candleData = data.map((d, index) => {
      const isSetupCandle = setupIndices.has(index);
      const baseCandle = {
        time: Math.floor(d.date.getTime() / 1000) as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      };

      if (isSetupCandle) {
        return {
          ...baseCandle,
          color: theme.setupCandle,
          borderColor: theme.setupCandleBorder,
          wickColor: theme.setupCandleBorder,
        };
      }

      return baseCandle;
    });

    // Formatar dados para volume
    const volumeData = data.map((d) => ({
      time: Math.floor(d.date.getTime() / 1000) as any,
      value: d.volume,
      color: d.close >= d.open ? theme.volumeUp : theme.volumeDown,
    }));

    // Formatar dados para EMA8
    const ema8Data = data
      .filter((d) => d.ema8 !== null)
      .map((d) => ({
        time: Math.floor(d.date.getTime() / 1000) as any,
        value: d.ema8 as number,
      }));

    // Formatar dados para EMA80
    const ema80Data = data
      .filter((d) => d.ema80 !== null)
      .map((d) => ({
        time: Math.floor(d.date.getTime() / 1000) as any,
        value: d.ema80 as number,
      }));

    // Criar série de candlestick
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: theme.candleUp,
      downColor: theme.candleDown,
      borderUpColor: theme.candleUp,
      borderDownColor: theme.candleDown,
      wickUpColor: theme.candleUp,
      wickDownColor: theme.candleDown,
    });
    candleSeries.setData(candleData);

    // Adicionar marcadores "1", "2", "3" acima dos candles do setup
    const markers: SeriesMarker<Time>[] = [];

    // Calcular índices ajustados para os marcadores
    const p1AdjustedIndex = setup.meta.p1Index !== undefined
      ? setup.meta.p1Index + indexOffset
      : -1;
    const p2AdjustedIndex = setup.meta.p2Index !== undefined
      ? setup.meta.p2Index + indexOffset
      : -1;
    const p3AdjustedIndex = setup.meta.p3Index !== undefined
      ? setup.meta.p3Index + indexOffset
      : -1;

    // Determinar se é compra ou venda baseado no setup.id ou entry vs p2
    const isBuyOperation = setup.id?.includes('compra') ||
      (setup.meta.entry && setup.meta.p2 && setup.meta.entry > setup.meta.p2);

    // Configurações baseadas no tipo de operação
    const markerPosition = isBuyOperation ? 'belowBar' : 'aboveBar';
    const markerShape = isBuyOperation ? 'arrowUp' : 'arrowDown';
    const markerColor = isBuyOperation ? theme.entry : theme.stopLoss; // Verde para compra, vermelho para venda

    // Adicionar marcador "1" para P1
    if (p1AdjustedIndex >= 0 && p1AdjustedIndex < data.length) {
      markers.push({
        time: Math.floor(data[p1AdjustedIndex].date.getTime() / 1000) as Time,
        position: markerPosition,
        color: markerColor,
        shape: markerShape,
        text: '1',
        size: 1,
      });
    }

    // Adicionar marcador "2" para P2
    if (p2AdjustedIndex >= 0 && p2AdjustedIndex < data.length) {
      markers.push({
        time: Math.floor(data[p2AdjustedIndex].date.getTime() / 1000) as Time,
        position: markerPosition,
        color: markerColor,
        shape: markerShape,
        text: '2',
        size: 1,
      });
    }

    // Adicionar marcador "3" para P3
    if (p3AdjustedIndex >= 0 && p3AdjustedIndex < data.length) {
      markers.push({
        time: Math.floor(data[p3AdjustedIndex].date.getTime() / 1000) as Time,
        position: markerPosition,
        color: markerColor,
        shape: markerShape,
        text: '3',
        size: 1,
      });
    }

    // Adicionar marcadores e linhas para sinais historicos
    if (historicalSignals.length > 0) {
      // Criar mapa de timestamps para indices
      const timestampToIndex = new Map<number, number>();
      data.forEach((d, idx) => {
        const ts = Math.floor(d.date.getTime() / 1000);
        timestampToIndex.set(ts, idx);
      });

      for (const signal of historicalSignals) {
        // Converter signal_time para timestamp
        const signalTs = Math.floor(new Date(signal.signal_time).getTime() / 1000);

        // Encontrar indice mais proximo (pode haver diferenca de alguns segundos)
        let signalIndex = timestampToIndex.get(signalTs);

        // Se nao encontrar exato, buscar o mais proximo
        if (signalIndex === undefined) {
          let minDiff = Infinity;
          for (const [ts, idx] of timestampToIndex) {
            const diff = Math.abs(ts - signalTs);
            if (diff < minDiff && diff < 7200) { // Max 2 horas de diferenca
              minDiff = diff;
              signalIndex = idx;
            }
          }
        }

        if (signalIndex === undefined || signalIndex < 0 || signalIndex >= data.length) {
          continue;
        }

        const color = getSignalColor(signal.status);
        const isBuy = signal.setup_type === '123-compra';
        const position = isBuy ? 'belowBar' : 'aboveBar';
        const shape = isBuy ? 'arrowUp' : 'arrowDown';

        // Adicionar marcador com texto descritivo do resultado
        const statusText = signal.status === 'success' ? 'TP' :
                          signal.status === 'failure' ? 'LOSS' :
                          signal.status === 'expired' ? 'N/E' : 'PEND';

        markers.push({
          time: Math.floor(data[signalIndex].date.getTime() / 1000) as Time,
          position: position as 'belowBar' | 'aboveBar',
          color,
          shape: shape as 'arrowUp' | 'arrowDown',
          text: statusText,
          size: 1,
        });

        // Sinais "expired" (nao executados) - apenas mostrar marcador, sem linhas
        if (signal.status === 'expired') {
          continue;
        }

        // Calcular indices de inicio e fim da operacao
        // As linhas comecam no P3 (signalIndex) e vao ate a resolucao
        const entryIdx = signalIndex; // Comeca no candle P3
        const candlesToResolve = signal.candles_to_resolve || 10;
        const resolveIdx = Math.min(signalIndex + candlesToResolve, data.length - 1);

        // Verificar se temos candles suficientes
        if (entryIdx >= data.length) continue;

        // Criar dados para as linhas deste sinal especifico
        const entryLineData: Array<{ time: Time; value: number }> = [];
        const tpLineData: Array<{ time: Time; value: number }> = [];
        const slLineData: Array<{ time: Time; value: number }> = [];

        for (let i = entryIdx; i <= resolveIdx; i++) {
          const time = Math.floor(data[i].date.getTime() / 1000) as Time;
          entryLineData.push({ time, value: signal.entry_price });
          tpLineData.push({ time, value: signal.target_price });
          slLineData.push({ time, value: signal.stop_price });
        }

        // Criar serie de linha de entrada (verde) para este sinal
        if (entryLineData.length > 0) {
          const entrySeries = chart.addSeries(LineSeries, {
            color: '#16a34a',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          entrySeries.setData(entryLineData);
        }

        // Criar serie de linha de Take Profit (azul) para este sinal
        if (tpLineData.length > 0) {
          const tpSeries = chart.addSeries(LineSeries, {
            color: '#2563eb',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          tpSeries.setData(tpLineData);
        }

        // Criar serie de linha de Stop Loss (vermelho) para este sinal
        if (slLineData.length > 0) {
          const slSeries = chart.addSeries(LineSeries, {
            color: '#dc2626',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          slSeries.setData(slLineData);
        }
      }
    }

    // Ordenar marcadores por tempo (necessário para lightweight-charts)
    markers.sort((a, b) => (a.time as number) - (b.time as number));

    // Criar markers usando a nova API do v5
    if (markers.length > 0) {
      createSeriesMarkers(candleSeries, markers);
    }

    // Criar série de volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0.08 },
    });
    volumeSeries.setData(volumeData);

    // Criar série do MACD Histograma
    const macdHistogramData = data
      .filter((d) => d.macdHistogram !== null)
      .map((d) => ({
        time: Math.floor(d.date.getTime() / 1000) as any,
        value: d.macdHistogram as number,
        color: (d.macdHistogram as number) >= 0 ? theme.macdPositive : theme.macdNegative,
      }));

    if (macdHistogramData.length > 0) {
      const macdSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 2 },
        priceScaleId: 'macd',
      });
      macdSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.92, bottom: 0 },
      });
      macdSeries.setData(macdHistogramData);
    }

    // Criar série EMA8
    const ema8Series = chart.addSeries(LineSeries, {
      color: theme.ema8,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    ema8Series.setData(ema8Data);

    // Criar série EMA80
    const ema80Series = chart.addSeries(LineSeries, {
      color: theme.ema80,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    ema80Series.setData(ema80Data);

    // Adicionar níveis horizontais do setup
    const { p2, entry } = setup.meta;
    const stopLoss = p2; // P2 é o Stop Loss

    // Determinar se é compra ou venda baseado na relação entry/stop
    const isBuySetup = entry && stopLoss && entry > stopLoss;

    // Calcular Take Profit (161.8% de Fibonacci)
    let takeProfit: number | null = null;
    if (entry && stopLoss) {
      const riskDistance = Math.abs(entry - stopLoss);
      if (isBuySetup) {
        // Compra: TP acima da entrada
        takeProfit = entry + (riskDistance * 1.618);
      } else {
        // Venda: TP abaixo da entrada
        takeProfit = entry - (riskDistance * 1.618);
      }
    }

    // Linha de Stop Loss (SL)
    if (stopLoss) {
      candleSeries.createPriceLine({
        price: stopLoss,
        color: theme.stopLoss,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Stop Loss (SL)',
      });
    }

    // Linha de Entry
    if (entry) {
      candleSeries.createPriceLine({
        price: entry,
        color: theme.entry,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Entry',
      });
    }

    // Linha de Take Profit (TP) - 161.8%
    if (takeProfit) {
      candleSeries.createPriceLine({
        price: takeProfit,
        color: theme.takeProfit,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Take Profit (TP)',
      });
    }

    // Ajustar visualização para mostrar últimos candles
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, width, height, setup, historicalSignals]);

  // Atualizar tamanho quando width/height mudam
  useEffect(() => {
    if (chartRef.current && width > 0 && height > 0) {
      chartRef.current.applyOptions({ width, height });
    }
  }, [width, height]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
