import type {
  Candle,
  SetupResult,
  SetupStatus,
  RiskLevel,
  VolatilityLevel,
  Trend,
} from '../../domain/types.js';
import {
  MYSTIC_PULSE_ADX_LENGTH,
  MYSTIC_PULSE_COLLECT_LENGTH,
  MYSTIC_PULSE_GAMMA,
  MYSTIC_PULSE_STRONG_THRESHOLD,
  MYSTIC_PULSE_INTENSITY_THRESHOLD,
  ATR_PERIOD,
} from '../../domain/constants.js';
import { mysticPulse, type MysticPulseResult } from '../indicators/mystic-pulse.js';
import { atr } from '../indicators/atr.js';

interface MysticPulseAnalysis {
  pulse: MysticPulseResult;
  atrValue: number;
  currentClose: number;
  status: SetupStatus;
  direction: 'LONG' | 'SHORT';
}

/**
 * Analisa o Mystic Pulse para detectar momentum de tendencia
 */
function analyzeMysticPulse(
  candles: Candle[],
  trend: Trend
): MysticPulseAnalysis | null {
  if (candles.length < MYSTIC_PULSE_ADX_LENGTH + 2) {
    return null;
  }

  const pulse = mysticPulse(
    candles,
    MYSTIC_PULSE_ADX_LENGTH,
    MYSTIC_PULSE_COLLECT_LENGTH,
    MYSTIC_PULSE_GAMMA
  );

  if (!pulse) {
    return null;
  }

  const atrValue = atr(ATR_PERIOD, candles);
  if (atrValue === null) {
    return null;
  }

  const currentCandle = candles[candles.length - 1];
  const currentClose = currentCandle.close;

  // Determinar direcao baseada no score
  const direction: 'LONG' | 'SHORT' = pulse.isBullish ? 'LONG' : 'SHORT';

  // Determinar status
  let status: SetupStatus = 'INVALIDO';
  const absScore = Math.abs(pulse.trendScore);

  // ATIVO: Score forte e intensidade alta, alinhado com tendencia
  if (absScore >= MYSTIC_PULSE_STRONG_THRESHOLD && pulse.intensity >= MYSTIC_PULSE_INTENSITY_THRESHOLD) {
    // Verificar alinhamento com tendencia
    const isAligned =
      (pulse.isBullish && trend === 'Alta') ||
      (!pulse.isBullish && trend === 'Baixa');

    if (isAligned) {
      status = 'ATIVO';
    } else if (trend === 'Lateral') {
      // Em tendencia lateral, aceita qualquer direcao forte
      status = 'ATIVO';
    } else {
      // Contra tendencia - em formacao (mais arriscado)
      status = 'EM_FORMACAO';
    }
  }
  // EM_FORMACAO: Score moderado ou intensidade baixa
  else if (absScore >= 1) {
    status = 'EM_FORMACAO';
  }

  return {
    pulse,
    atrValue,
    currentClose,
    status,
    direction,
  };
}

/**
 * Determina o nivel de risco baseado na volatilidade e alinhamento
 */
function determineRisk(
  volatility: VolatilityLevel,
  trend: Trend,
  isBullish: boolean
): RiskLevel {
  // Contra tendencia = alto risco
  if ((isBullish && trend === 'Baixa') || (!isBullish && trend === 'Alta')) {
    return 'Alto';
  }

  // Baseado na volatilidade
  switch (volatility) {
    case 'Alta':
      return 'Alto';
    case 'Media':
      return 'Moderado';
    case 'Baixa':
      return 'Baixo';
  }
}

/**
 * Detecta setup Mystic Pulse (Momentum de Tendencia)
 *
 * O Mystic Pulse usa DI+/DI- para identificar momentum direcional.
 * Quando DI+ sobe e supera DI-, incrementa contador positivo.
 * Quando DI- sobe e supera DI+, incrementa contador negativo.
 * O score acumulado indica forca da tendencia.
 */
export function detectMysticPulse(
  ticker: string,
  candles: Candle[],
  trend: Trend,
  volatility: VolatilityLevel,
  successRate: number
): SetupResult | null {
  const analysis = analyzeMysticPulse(candles, trend);

  if (!analysis) {
    return null;
  }

  const { pulse, atrValue, currentClose, status, direction } = analysis;

  // Stop sugerido baseado no ATR e direcao
  const stopDistance = 1.5 * atrValue;
  const stopLevel =
    direction === 'LONG'
      ? currentClose - stopDistance
      : currentClose + stopDistance;

  // Signals baseados no status
  const signals: string[] = [];

  if (status === 'ATIVO') {
    if (direction === 'LONG') {
      signals.push('Momentum de alta confirmado');
      signals.push(`DI+ dominante (${pulse.diPlus.toFixed(1)} > ${pulse.diMinus.toFixed(1)})`);
    } else {
      signals.push('Momentum de baixa confirmado');
      signals.push(`DI- dominante (${pulse.diMinus.toFixed(1)} > ${pulse.diPlus.toFixed(1)})`);
    }
    signals.push(`Score de tendencia: ${pulse.trendScore}`);
    signals.push(`Intensidade: ${(pulse.intensity * 100).toFixed(0)}%`);
  } else if (status === 'EM_FORMACAO') {
    signals.push('Momentum em desenvolvimento');
    if (pulse.trendScore !== 0) {
      signals.push(`Direcao atual: ${direction}`);
    }
    signals.push(`Score: ${pulse.trendScore}`);
  }

  // Explanation
  let explanation = '';
  if (status === 'ATIVO') {
    const direcaoTexto = direction === 'LONG' ? 'alta' : 'baixa';
    explanation =
      `Mystic Pulse detectou momentum forte de ${direcaoTexto}. ` +
      `O indicador DI${direction === 'LONG' ? '+' : '-'} esta dominante com score acumulado de ${pulse.trendScore}. ` +
      `Intensidade de ${(pulse.intensity * 100).toFixed(0)}% indica forca do movimento.`;
  } else if (status === 'EM_FORMACAO') {
    explanation =
      `Mystic Pulse em formacao com score de ${pulse.trendScore}. ` +
      `Aguardando confirmacao de momentum mais forte para ativacao completa.`;
  } else {
    explanation =
      `Mystic Pulse inativo. Score neutro (${pulse.trendScore}) ` +
      `indica ausencia de momentum direcional claro.`;
  }

  const title =
    direction === 'LONG' ? 'Mystic Pulse (Alta)' : 'Mystic Pulse (Baixa)';

  return {
    id: `mystic-pulse-${ticker.toLowerCase()}`,
    title,
    status,
    successRate,
    risk: determineRisk(volatility, trend, pulse.isBullish),
    stopSuggestion: `R$ ${stopLevel.toFixed(2)} (${direction === 'LONG' ? 'abaixo' : 'acima'} do preco atual, 1.5x ATR)`,
    targetNote:
      `Taxa historica de ${successRate}% em movimentos similares. ` +
      `Nao constitui garantia de resultado futuro.`,
    explanation,
    signals,
    meta: {
      trendScore: pulse.trendScore,
      positiveCount: pulse.positiveCount,
      negativeCount: pulse.negativeCount,
      intensity: Math.round(pulse.intensity * 100) / 100,
      diPlus: Math.round(pulse.diPlus * 100) / 100,
      diMinus: Math.round(pulse.diMinus * 100) / 100,
      atr: Math.round(atrValue * 100) / 100,
      currentClose: Math.round(currentClose * 100) / 100,
      stopLevel: Math.round(stopLevel * 100) / 100,
    },
  };
}

/**
 * Verifica se o setup estava ativo em um momento historico
 * Usado para backtest
 */
export function wasMysticPulseActive(
  candles: Candle[],
  index: number,
  trend: Trend
): boolean {
  if (index < MYSTIC_PULSE_ADX_LENGTH + 2 || index >= candles.length) {
    return false;
  }

  const slicedCandles = candles.slice(0, index + 1);
  const analysis = analyzeMysticPulse(slicedCandles, trend);

  return analysis?.status === 'ATIVO';
}
