'use client';

import {
  ChartCanvas,
  Chart,
  CandlestickSeries,
  LineSeries,
  BarSeries,
  XAxis,
  YAxis,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  discontinuousTimeScaleProviderBuilder,
} from 'react-financial-charts';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import type { Setup } from '@/types/market';

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

interface SetupChartInnerProps {
  data: ChartDataPoint[];
  width: number;
  height: number;
  setup: Setup;
  ticker: string;
}

const priceFormat = format('.2f');
const volumeFormat = format('.2s');
const dateFormat = timeFormat('%d/%m/%Y');

export function SetupChartInner({
  data,
  width,
  height,
  setup,
}: SetupChartInnerProps) {
  const margin = { left: 0, right: 70, top: 20, bottom: 30 };
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  const scaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
    (d: ChartDataPoint) => d.date
  );

  const { data: chartData, xScale, xAccessor, displayXAccessor } = scaleProvider(data);

  const max = xAccessor(chartData[chartData.length - 1]);
  const min = xAccessor(chartData[0]);
  const xExtents = [min, max + 2];

  // Calculate price range for y axis (all data)
  const prices = chartData.flatMap((d) => [d.high, d.low]);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  // Get setup-specific levels
  const resistance = setup.meta.resistance;
  const support = setup.meta.support;
  const stopLevel = setup.meta.stopLevel;

  // Chart heights - 75% for price, 25% for volume
  const volumeChartHeight = height * 0.2;
  const priceChartHeight = height - volumeChartHeight - margin.top - margin.bottom;

  return (
    <ChartCanvas
      height={height}
      width={width}
      ratio={ratio}
      margin={margin}
      data={chartData}
      displayXAccessor={displayXAccessor}
      seriesName={`${setup.id}`}
      xScale={xScale}
      xAccessor={xAccessor}
      xExtents={xExtents}
    >
      {/* Price Chart */}
      <Chart
        id={1}
        height={priceChartHeight}
        yExtents={[minPrice, maxPrice]}
      >
        <YAxis strokeStyle="#666" tickStrokeStyle="#666" tickFormat={priceFormat} />

        <MouseCoordinateY rectWidth={margin.right} displayFormat={priceFormat} />

        {/* Candlesticks */}
        <CandlestickSeries
          wickStroke={(d: ChartDataPoint) => (d.close > d.open ? '#22c55e' : '#ef4444')}
          fill={(d: ChartDataPoint) => (d.close > d.open ? '#22c55e' : '#ef4444')}
        />

        {/* EMA20 */}
        <LineSeries
          yAccessor={(d: ChartDataPoint) => d.sma20 ?? undefined}
          strokeStyle="#3b82f6"
          strokeWidth={2}
        />

        {/* EMA50 */}
        <LineSeries
          yAccessor={(d: ChartDataPoint) => d.sma50 ?? undefined}
          strokeStyle="#f97316"
          strokeWidth={2}
        />

        {/* Resistance line (if exists) */}
        {resistance && (
          <LineSeries
            yAccessor={() => resistance}
            strokeStyle="#dc2626"
            strokeWidth={1}
            strokeDasharray="Dash"
          />
        )}

        {/* Support line (if exists) */}
        {support && (
          <LineSeries
            yAccessor={() => support}
            strokeStyle="#dc2626"
            strokeWidth={1}
            strokeDasharray="Dash"
          />
        )}

        {/* Stop level */}
        {stopLevel && (
          <LineSeries
            yAccessor={() => stopLevel}
            strokeStyle="#ef4444"
            strokeWidth={2}
            strokeDasharray="LongDash"
          />
        )}
      </Chart>

      {/* Volume Chart */}
      <Chart
        id={2}
        height={volumeChartHeight}
        origin={(w: number, h: number) => [0, h - volumeChartHeight - margin.bottom]}
        yExtents={(d: ChartDataPoint) => d.volume}
      >
        <XAxis strokeStyle="#666" tickStrokeStyle="#666" />
        <YAxis strokeStyle="#666" tickStrokeStyle="#666" tickFormat={volumeFormat} ticks={3} />

        <MouseCoordinateX displayFormat={dateFormat} />

        <BarSeries
          yAccessor={(d: ChartDataPoint) => d.volume}
          fillStyle={(d: ChartDataPoint) =>
            d.close > d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          }
        />
      </Chart>

      <CrossHairCursor strokeStyle="#999" />
    </ChartCanvas>
  );
}
