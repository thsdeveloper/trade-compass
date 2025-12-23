import type { Candle, Context, Trend, VolumeLevel, VolatilityLevel } from '../domain/types.js';
import {
  SMA_SHORT_PERIOD,
  SMA_LONG_PERIOD,
  ATR_PERIOD,
  VOLUME_PERIOD,
  VOLATILITY_LOW_THRESHOLD,
  VOLATILITY_HIGH_THRESHOLD,
  VOLUME_LOW_THRESHOLD,
  VOLUME_HIGH_THRESHOLD,
} from '../domain/constants.js';
import { sma } from './indicators/sma.js';
import { atrPercent } from './indicators/atr.js';
import { volumeRatio } from './indicators/volume.js';

/**
 * Calcula a tendencia baseada em SMAs
 * - Alta: close > sma50 AND sma20 > sma50
 * - Baixa: close < sma50 AND sma20 < sma50
 * - Lateral: caso contrario
 */
export function calculateTrend(candles: Candle[]): Trend {
  const closes = candles.map((c) => c.close);
  const currentClose = closes[closes.length - 1];

  const sma20 = sma(SMA_SHORT_PERIOD, closes);
  const sma50 = sma(SMA_LONG_PERIOD, closes);

  if (sma20 === null || sma50 === null) {
    return 'Lateral';
  }

  if (currentClose > sma50 && sma20 > sma50) {
    return 'Alta';
  }

  if (currentClose < sma50 && sma20 < sma50) {
    return 'Baixa';
  }

  return 'Lateral';
}

/**
 * Calcula o nivel de volume
 * - Abaixo: ratio < 0.8
 * - Normal: 0.8 <= ratio <= 1.2
 * - Acima: ratio > 1.2
 */
export function calculateVolumeLevel(candles: Candle[]): VolumeLevel {
  const ratio = volumeRatio(VOLUME_PERIOD, candles);

  if (ratio === null) {
    return 'Normal';
  }

  if (ratio < VOLUME_LOW_THRESHOLD) {
    return 'Abaixo';
  }

  if (ratio > VOLUME_HIGH_THRESHOLD) {
    return 'Acima';
  }

  return 'Normal';
}

/**
 * Calcula o nivel de volatilidade baseado em ATR%
 * - Baixa: ATR% < 1.5%
 * - Media: 1.5% <= ATR% <= 3%
 * - Alta: ATR% > 3%
 */
export function calculateVolatilityLevel(candles: Candle[]): VolatilityLevel {
  const atrPct = atrPercent(ATR_PERIOD, candles);

  if (atrPct === null) {
    return 'Media';
  }

  if (atrPct < VOLATILITY_LOW_THRESHOLD) {
    return 'Baixa';
  }

  if (atrPct > VOLATILITY_HIGH_THRESHOLD) {
    return 'Alta';
  }

  return 'Media';
}

/**
 * Calcula o contexto completo do ativo
 */
export function calculateContext(candles: Candle[]): Context {
  return {
    trend: calculateTrend(candles),
    volume: calculateVolumeLevel(candles),
    volatility: calculateVolatilityLevel(candles),
  };
}

/**
 * Retorna os valores numericos usados no calculo do contexto
 * Util para debug e meta info
 */
export function getContextMeta(candles: Candle[]): Record<string, number> {
  const closes = candles.map((c) => c.close);

  const sma20Value = sma(SMA_SHORT_PERIOD, closes);
  const sma50Value = sma(SMA_LONG_PERIOD, closes);
  const atrPctValue = atrPercent(ATR_PERIOD, candles);
  const volRatioValue = volumeRatio(VOLUME_PERIOD, candles);

  return {
    sma20: sma20Value ?? 0,
    sma50: sma50Value ?? 0,
    atrPercent: atrPctValue ?? 0,
    volumeRatio: volRatioValue ?? 0,
    currentClose: closes[closes.length - 1] ?? 0,
    currentVolume: candles[candles.length - 1]?.volume ?? 0,
  };
}
