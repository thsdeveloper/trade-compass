import type { Candle } from '../../domain/types.js';

/**
 * True Range (TR)
 * TR = max(high - low, |high - close_anterior|, |low - close_anterior|)
 */
export function trueRange(current: Candle, previous: Candle | null): number {
  const highLow = current.high - current.low;

  if (!previous) {
    return highLow;
  }

  const highPrevClose = Math.abs(current.high - previous.close);
  const lowPrevClose = Math.abs(current.low - previous.close);

  return Math.max(highLow, highPrevClose, lowPrevClose);
}

/**
 * Average True Range (ATR)
 * Media dos True Ranges dos ultimos N periodos
 */
export function atr(period: number, candles: Candle[]): number | null {
  if (candles.length < period + 1 || period <= 0) {
    return null;
  }

  // Calcular TRs
  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    trs.push(trueRange(candles[i], candles[i - 1]));
  }

  // Pegar os ultimos N TRs
  const recentTrs = trs.slice(-period);

  if (recentTrs.length < period) {
    return null;
  }

  const sum = recentTrs.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * ATR como percentual do preco (ATR%)
 * Util para comparar volatilidade entre ativos de precos diferentes
 */
export function atrPercent(period: number, candles: Candle[]): number | null {
  const atrValue = atr(period, candles);
  if (atrValue === null) return null;

  const lastClose = candles[candles.length - 1].close;
  if (lastClose === 0) return null;

  return (atrValue / lastClose) * 100;
}
