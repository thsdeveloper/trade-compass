import type { Candle } from '../../domain/types.js';

/**
 * Media de volume dos ultimos N candles
 */
export function avgVolume(period: number, candles: Candle[]): number | null {
  if (candles.length < period || period <= 0) {
    return null;
  }

  const recentCandles = candles.slice(-period);
  const sum = recentCandles.reduce((acc, c) => acc + c.volume, 0);

  return sum / period;
}

/**
 * Ratio do volume atual em relacao a media
 */
export function volumeRatio(period: number, candles: Candle[]): number | null {
  const avg = avgVolume(period, candles.slice(0, -1)); // Excluir o atual da media
  if (avg === null || avg === 0) return null;

  const currentVolume = candles[candles.length - 1].volume;
  return currentVolume / avg;
}
