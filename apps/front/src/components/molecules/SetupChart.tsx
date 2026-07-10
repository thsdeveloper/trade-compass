'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Candle, Setup, MysticPulseDataPoint, HistoricalSignal, MACDResult } from '@/types/market';

// Dynamic import para evitar SSR (lightweight-charts precisa de window)
const SetupChartInner = dynamic(
  () => import('./SetupChartInner').then((mod) => mod.SetupChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] flex items-center justify-center bg-white rounded-lg border">
        <div className="text-muted-foreground">Carregando grafico...</div>
      </div>
    ),
  }
);

interface SetupChartProps {
  ticker: string;
  candles: Candle[];
  indicators: {
    ema8: (number | null)[];
    ema80: (number | null)[];
    macd?: MACDResult[];
  };
  setup: Setup;
  mysticPulseData?: MysticPulseDataPoint[] | null;
  historicalSignals?: HistoricalSignal[];
}

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

export function SetupChart({ ticker, candles, indicators, setup, historicalSignals = [] }: SetupChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preparar dados para o gráfico
  const chartData: ChartDataPoint[] = candles.map((candle, i) => ({
    date: new Date(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    ema8: indicators.ema8[i],
    ema80: indicators.ema80[i],
    macdHistogram: indicators.macd?.[i]?.histogram ?? null,
  }));

  // Atualizar dimensões
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.round(width) || 800,
        height: Math.max(Math.round(height) || 500, 400),
      });
    }
  }, []);

  // Observar mudanças de tamanho
  useEffect(() => {
    const debouncedUpdate = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateDimensions, 100);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(debouncedUpdate);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]">
      <SetupChartInner
        data={chartData}
        width={dimensions.width}
        height={dimensions.height}
        setup={setup}
        ticker={ticker}
        historicalSignals={historicalSignals}
      />
    </div>
  );
}
