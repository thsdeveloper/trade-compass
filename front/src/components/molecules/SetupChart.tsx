'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Candle, Setup } from '@/types/market';

// Dynamic import para evitar SSR issues
const SetupChartInner = dynamic(
  () => import('./SetupChartInner').then((mod) => mod.SetupChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-muted-foreground">Carregando grafico...</div>
      </div>
    ),
  }
);

interface SetupChartProps {
  ticker: string;
  candles: Candle[];
  indicators: {
    sma20: (number | null)[];
    sma50: (number | null)[];
  };
  setup: Setup;
}

interface ChartDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number | null;
  sma50: number | null;
}

export function SetupChart({ ticker, candles, indicators, setup }: SetupChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Prepare data
  const chartData: ChartDataPoint[] = candles.map((candle, i) => ({
    date: new Date(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    sma20: indicators.sma20[i],
    sma50: indicators.sma50[i],
  }));

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: width || 800,
          height: Math.max(height || 500, 400)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Also observe container size changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]">
      <SetupChartInner
        data={chartData}
        width={dimensions.width}
        height={dimensions.height}
        setup={setup}
        ticker={ticker}
      />
    </div>
  );
}
