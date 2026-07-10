import type { Candle, Context, Trend, VolumeLevel, VolatilityLevel } from '../domain/types.js';
import {
  EMA_SHORT_PERIOD,
  EMA_LONG_PERIOD,
  ATR_PERIOD,
  VOLUME_PERIOD,
  VOLATILITY_LOW_THRESHOLD,
  VOLATILITY_HIGH_THRESHOLD,
  VOLUME_LOW_THRESHOLD,
  VOLUME_HIGH_THRESHOLD,
} from '../domain/constants.js';
import { ema } from './indicators/ema.js';
import { atrPercent } from './indicators/atr.js';
import { volumeRatio } from './indicators/volume.js';

/**
 * Calcula a tendencia baseada em EMAs (8 e 80)
 * - Alta: EMA8 > EMA80
 * - Baixa: EMA8 < EMA80
 * - Lateral: Dificil determinar com EMAs cruzadas, 
 *   mas vamos considerar estado de transicao se close estiver entre elas?
 *   Simplificacao solicitada: 8 > 80 = Alta, 8 < 80 = Baixa.
 */
export function calculateTrend(candles: Candle[]): Trend {
  const closes = candles.map((c) => c.close);
  const currentClose = closes[closes.length - 1];

  const ema8 = ema(EMA_SHORT_PERIOD, closes);
  const ema80 = ema(EMA_LONG_PERIOD, closes);

  if (ema8 === null || ema80 === null) {
    return 'Lateral';
  }

  if (ema8 > ema80) {
    return 'Alta';
  }

  if (ema8 < ema80) {
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

  const ema8Value = ema(EMA_SHORT_PERIOD, closes);
  const ema80Value = ema(EMA_LONG_PERIOD, closes);
  const atrPctValue = atrPercent(ATR_PERIOD, candles);
  const volRatioValue = volumeRatio(VOLUME_PERIOD, candles);

  return {
    ema8: ema8Value ?? 0,
    ema80: ema80Value ?? 0,
    atrPercent: atrPctValue ?? 0,
    volumeRatio: volRatioValue ?? 0,
    currentClose: closes[closes.length - 1] ?? 0,
    currentVolume: candles[candles.length - 1]?.volume ?? 0,
  };
}
