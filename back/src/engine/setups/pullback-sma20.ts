import type {
  Candle,
  SetupResult,
  SetupStatus,
  RiskLevel,
  Trend,
  VolumeLevel,
  VolatilityLevel,
} from '../../domain/types.js';
import { SMA_SHORT_PERIOD, ATR_PERIOD, PULLBACK_PROXIMITY_ATR_MULTIPLIER, PULLBACK_TOUCH_MULTIPLIER } from '../../domain/constants.js';
import { sma } from '../indicators/sma.js';
import { atr } from '../indicators/atr.js';

interface PullbackAnalysis {
  sma20: number;
  currentClose: number;
  currentLow: number;
  atrValue: number;
  distance: number;
  status: SetupStatus;
}

/**
 * Analisa se ha pullback na SMA20
 * Pre-requisito: tendencia de alta
 */
function analyzePullback(candles: Candle[], trend: Trend): PullbackAnalysis | null {
  if (candles.length < SMA_SHORT_PERIOD + ATR_PERIOD) {
    return null;
  }

  const closes = candles.map((c) => c.close);
  const currentCandle = candles[candles.length - 1];

  const sma20 = sma(SMA_SHORT_PERIOD, closes);
  const atrValue = atr(ATR_PERIOD, candles);

  if (sma20 === null || atrValue === null) {
    return null;
  }

  const currentClose = currentCandle.close;
  const currentLow = currentCandle.low;
  const distance = Math.abs(currentClose - sma20);

  // Determinar status
  let status: SetupStatus = 'INVALIDO';

  // Pre-requisito: tendencia de alta
  if (trend !== 'Alta') {
    return {
      sma20,
      currentClose,
      currentLow,
      atrValue,
      distance,
      status: 'INVALIDO',
    };
  }

  // ATIVO: low tocou a SMA20 e close ficou acima
  if (currentLow <= sma20 * PULLBACK_TOUCH_MULTIPLIER && currentClose > sma20) {
    status = 'ATIVO';
  }
  // EM_FORMACAO: proximo da SMA20
  else if (distance <= atrValue * PULLBACK_PROXIMITY_ATR_MULTIPLIER) {
    status = 'EM_FORMACAO';
  }

  return {
    sma20,
    currentClose,
    currentLow,
    atrValue,
    distance,
    status,
  };
}

/**
 * Determina o nivel de risco
 */
function determineRisk(
  volume: VolumeLevel,
  volatility: VolatilityLevel
): RiskLevel {
  // Volume fraco ou volatilidade alta aumentam o risco
  if (volume === 'Abaixo' || volatility === 'Alta') {
    return 'Alto';
  }
  if (volatility === 'Media') {
    return 'Moderado';
  }
  return 'Baixo';
}

/**
 * Detecta setup de Pullback na SMA20
 */
export function detectPullbackSma20(
  ticker: string,
  candles: Candle[],
  trend: Trend,
  volume: VolumeLevel,
  volatility: VolatilityLevel,
  successRate: number
): SetupResult | null {
  const analysis = analyzePullback(candles, trend);

  if (!analysis) {
    return null;
  }

  const { sma20, currentClose, atrValue, status } = analysis;

  // Stop sugerido abaixo da SMA20
  const stopLevel = sma20 - atrValue * PULLBACK_PROXIMITY_ATR_MULTIPLIER;

  // Signals
  const signals: string[] = [];
  if (status === 'ATIVO') {
    signals.push('Preco testou a SMA20 e reagiu');
    signals.push('Tendencia de alta confirmada');
  } else if (status === 'EM_FORMACAO') {
    signals.push('Preco se aproximando da SMA20');
    signals.push('Aguardando reacao na media');
  } else {
    if (trend !== 'Alta') {
      signals.push('Tendencia nao e de alta');
    }
  }

  // Explanation
  let explanation = '';
  if (status === 'ATIVO') {
    explanation =
      `Preco recuou ate a SMA20 em R$ ${sma20.toFixed(2)} e mostrou reacao positiva. ` +
      `Em tendencias de alta, pullbacks na media de 20 periodos historicamente ` +
      `oferecem pontos de entrada com boa relacao risco/retorno.`;
  } else if (status === 'EM_FORMACAO') {
    explanation =
      `Preco se aproximando da SMA20 em R$ ${sma20.toFixed(2)}. ` +
      `Aguardando teste da media com reacao positiva para ativacao do setup.`;
  } else {
    explanation =
      trend !== 'Alta'
        ? `Setup requer tendencia de alta. Tendencia atual: ${trend}.`
        : `Preco distante da SMA20 em R$ ${sma20.toFixed(2)}. Setup inativo.`;
  }

  return {
    id: `pullback-sma20-${ticker.toLowerCase()}`,
    title: 'Pullback na SMA20',
    status,
    successRate,
    risk: determineRisk(volume, volatility),
    stopSuggestion: `R$ ${stopLevel.toFixed(2)} (abaixo da SMA20 com folga de 0.5x ATR)`,
    targetNote:
      `Taxa historica de ${successRate}% em contextos similares. ` +
      `Nao constitui garantia de resultado futuro.`,
    explanation,
    signals,
    meta: {
      sma20: Math.round(sma20 * 100) / 100,
      currentClose: Math.round(currentClose * 100) / 100,
      atr: Math.round(atrValue * 100) / 100,
      stopLevel: Math.round(stopLevel * 100) / 100,
    },
  };
}

/**
 * Verifica se o setup estava ativo em um momento historico
 */
export function wasPullbackActive(
  candles: Candle[],
  index: number,
  trend: Trend
): boolean {
  if (index < SMA_SHORT_PERIOD + ATR_PERIOD || index >= candles.length) {
    return false;
  }

  const slicedCandles = candles.slice(0, index + 1);
  const analysis = analyzePullback(slicedCandles, trend);

  return analysis?.status === 'ATIVO';
}
