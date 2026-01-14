import { emaSeries } from './ema.js';

/**
 * MACD - Moving Average Convergence Divergence
 *
 * MACD Line = EMA(12) - EMA(26)
 * Signal Line = EMA(9) of MACD Line
 * Histogram = MACD Line - Signal Line
 */

export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/**
 * Calcula MACD para um valor especifico (ultimo valor)
 */
export function macd(
  values: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const series = macdSeries(values, fastPeriod, slowPeriod, signalPeriod);
  return series[series.length - 1] || { macd: null, signal: null, histogram: null };
}

/**
 * Calcula MACD para uma serie, retornando array com valores
 */
export function macdSeries(
  values: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  // Precisamos de pelo menos slowPeriod valores
  if (values.length < slowPeriod) {
    return values.map(() => ({ macd: null, signal: null, histogram: null }));
  }

  // Calcular EMAs
  const emaFast = emaSeries(fastPeriod, values);
  const emaSlow = emaSeries(slowPeriod, values);

  // Calcular MACD Line = EMA Fast - EMA Slow
  const macdLine: (number | null)[] = emaFast.map((fast, i) => {
    const slow = emaSlow[i];
    if (fast === null || slow === null) return null;
    return fast - slow;
  });

  // Filtrar valores nulos para calcular Signal Line
  const macdValues = macdLine.filter((v): v is number => v !== null);

  // Calcular Signal Line (EMA do MACD Line)
  const signalValues = emaSeries(signalPeriod, macdValues);

  // Mapear Signal de volta para o array original
  let signalIdx = 0;
  const signalLine: (number | null)[] = macdLine.map((m) => {
    if (m === null) return null;
    return signalValues[signalIdx++] ?? null;
  });

  // Calcular Histogram = MACD - Signal
  const result: MACDResult[] = values.map((_, i) => {
    const macdVal = macdLine[i];
    const signalVal = signalLine[i];

    if (macdVal === null || signalVal === null) {
      return { macd: macdVal, signal: signalVal, histogram: null };
    }

    return {
      macd: macdVal,
      signal: signalVal,
      histogram: macdVal - signalVal,
    };
  });

  return result;
}
