import type { Candle, SetupResult, SetupStatus, RiskLevel, VolatilityLevel } from '../../domain/types.js';
import {
  BREAKOUT_LOOKBACK,
  BREAKOUT_PROXIMITY,
  BREAKOUT_VOLUME_MULTIPLIER,
  ATR_PERIOD,
} from '../../domain/constants.js';
import { atr } from '../indicators/atr.js';
import { avgVolume, volumeRatio } from '../indicators/volume.js';

interface BreakoutAnalysis {
  resistance: number;
  currentClose: number;
  currentVolume: number;
  avgVolumeValue: number;
  volumeRatioValue: number;
  atrValue: number;
  status: SetupStatus;
}

/**
 * Analisa se ha breakout de resistencia
 * Resistencia = maxima dos ultimos N candles (exceto o atual)
 */
function analyzeBreakout(candles: Candle[]): BreakoutAnalysis | null {
  if (candles.length < BREAKOUT_LOOKBACK + 1) {
    return null;
  }

  const currentCandle = candles[candles.length - 1];
  const lookbackCandles = candles.slice(-BREAKOUT_LOOKBACK - 1, -1);

  // Calcular resistencia (maxima do periodo)
  const resistance = Math.max(...lookbackCandles.map((c) => c.high));

  // Valores atuais
  const currentClose = currentCandle.close;
  const currentVolume = currentCandle.volume;

  // Indicadores
  const avgVol = avgVolume(BREAKOUT_LOOKBACK, candles.slice(0, -1));
  const volRatio = volumeRatio(BREAKOUT_LOOKBACK, candles);
  const atrValue = atr(ATR_PERIOD, candles);

  if (avgVol === null || atrValue === null) {
    return null;
  }

  // Determinar status
  let status: SetupStatus = 'INVALIDO';

  // ATIVO: rompeu resistencia com volume
  if (currentClose > resistance && (volRatio ?? 0) > BREAKOUT_VOLUME_MULTIPLIER) {
    status = 'ATIVO';
  }
  // EM_FORMACAO: proximo da resistencia
  else if (currentClose >= resistance * BREAKOUT_PROXIMITY) {
    status = 'EM_FORMACAO';
  }

  return {
    resistance,
    currentClose,
    currentVolume,
    avgVolumeValue: avgVol,
    volumeRatioValue: volRatio ?? 0,
    atrValue,
    status,
  };
}

/**
 * Determina o nivel de risco baseado na volatilidade
 */
function determineRisk(volatility: VolatilityLevel): RiskLevel {
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
 * Detecta setup de Breakout (Rompimento de Resistencia)
 */
export function detectBreakout(
  ticker: string,
  candles: Candle[],
  volatility: VolatilityLevel,
  successRate: number
): SetupResult | null {
  const analysis = analyzeBreakout(candles);

  if (!analysis) {
    return null;
  }

  const { resistance, currentClose, atrValue, volumeRatioValue, status } = analysis;

  // Stop sugerido abaixo da resistencia
  const stopLevel = resistance - 0.5 * atrValue;

  // Signals baseados no status
  const signals: string[] = [];
  if (status === 'ATIVO') {
    signals.push('Rompimento de resistencia confirmado');
    if (volumeRatioValue > BREAKOUT_VOLUME_MULTIPLIER) {
      signals.push(`Volume ${volumeRatioValue.toFixed(1)}x acima da media`);
    }
  } else if (status === 'EM_FORMACAO') {
    signals.push('Preco proximo da resistencia');
    signals.push('Aguardando confirmacao de volume');
  }

  // Explanation
  let explanation = '';
  if (status === 'ATIVO') {
    explanation =
      `Preco rompeu a resistencia em R$ ${resistance.toFixed(2)} com volume ` +
      `${volumeRatioValue.toFixed(1)}x acima da media. Historicamente, ` +
      `rompimentos com volume tem apresentado continuidade.`;
  } else if (status === 'EM_FORMACAO') {
    explanation =
      `Preco testando resistencia em R$ ${resistance.toFixed(2)}. ` +
      `Aguardando fechamento acima com confirmacao de volume para ativacao.`;
  } else {
    explanation = `Preco distante da resistencia em R$ ${resistance.toFixed(2)}. Setup inativo.`;
  }

  return {
    id: `breakout-${ticker.toLowerCase()}`,
    title: 'Rompimento de Resistencia',
    status,
    successRate,
    risk: determineRisk(volatility),
    stopSuggestion: `R$ ${stopLevel.toFixed(2)} (abaixo da resistencia rompida, com folga de 0.5x ATR)`,
    targetNote:
      `Taxa historica de ${successRate}% em movimentos similares. ` +
      `Nao constitui garantia de resultado futuro.`,
    explanation,
    signals,
    meta: {
      resistance: Math.round(resistance * 100) / 100,
      currentClose: Math.round(currentClose * 100) / 100,
      atr: Math.round(atrValue * 100) / 100,
      volumeRatio: Math.round(volumeRatioValue * 100) / 100,
      stopLevel: Math.round(stopLevel * 100) / 100,
    },
  };
}

/**
 * Verifica se o setup estava ativo em um momento historico
 * Usado para backtest
 */
export function wasBreakoutActive(candles: Candle[], index: number): boolean {
  if (index < BREAKOUT_LOOKBACK + 1 || index >= candles.length) {
    return false;
  }

  const slicedCandles = candles.slice(0, index + 1);
  const analysis = analyzeBreakout(slicedCandles);

  return analysis?.status === 'ATIVO';
}
