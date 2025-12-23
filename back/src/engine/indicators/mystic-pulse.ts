import type { Candle } from '../../domain/types.js';

/**
 * Mystic Pulse V2.0 - Indicador de Momentum de Tendencia
 * Baseado no indicador original de chervolino
 *
 * Utiliza DI+/DI- (Directional Index) para detectar mudancas de momentum
 * e conta a persistencia da tendencia atraves de contadores acumulativos.
 */

export interface MysticPulseResult {
  positiveCount: number;
  negativeCount: number;
  trendScore: number; // positiveCount - negativeCount
  isBullish: boolean;
  intensity: number; // 0.0 a 1.0 (normalizado)
  diPlus: number;
  diMinus: number;
}

interface MysticPulseState {
  // Valores anteriores para suavizacao
  prevClose: number | null;
  prevHigh: number | null;
  prevLow: number | null;

  // Variaveis de suavizacao (Wilder's Smoothing)
  smoothTR: number | null;
  smoothDMPlus: number | null;
  smoothDMMinus: number | null;

  // DI anteriores para comparacao
  prevDIPlus: number | null;
  prevDIMinus: number | null;

  // Contadores de tendencia
  positiveCount: number;
  negativeCount: number;

  // Historico de scores para normalizacao
  scoreHistory: number[];
}

/**
 * Calcula a correcao gamma para intensidade visual
 */
function calculateGammaIntensity(
  value: number,
  min: number,
  max: number,
  gamma: number
): number {
  if (min === max) return 0;
  let norm = (value - min) / (max - min);
  norm = Math.max(0, Math.min(1, norm)); // Clamp 0-1
  return Math.pow(norm, gamma);
}

/**
 * Calcula o True Range de um candle
 */
function trueRange(
  high: number,
  low: number,
  prevClose: number | null
): number {
  if (prevClose === null) {
    return high - low;
  }
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

/**
 * Calcula Mystic Pulse para uma serie de candles
 *
 * @param candles Array de candles OHLCV
 * @param adxLength Periodo para suavizacao RMA (default: 9)
 * @param collectLength Janela para normalizacao de intensidade (default: 100)
 * @param gamma Correcao gamma para visualizacao (default: 0.7)
 */
export function mysticPulse(
  candles: Candle[],
  adxLength = 9,
  collectLength = 100,
  gamma = 0.7
): MysticPulseResult | null {
  if (candles.length < adxLength + 2) {
    return null;
  }

  // Estado interno
  const state: MysticPulseState = {
    prevClose: null,
    prevHigh: null,
    prevLow: null,
    smoothTR: null,
    smoothDMPlus: null,
    smoothDMMinus: null,
    prevDIPlus: null,
    prevDIMinus: null,
    positiveCount: 0,
    negativeCount: 0,
    scoreHistory: [],
  };

  let lastResult: MysticPulseResult | null = null;

  for (const candle of candles) {
    const { high, low, close } = candle;

    // Inicializacao do primeiro candle
    if (state.prevClose === null) {
      state.prevClose = close;
      state.prevHigh = high;
      state.prevLow = low;
      continue;
    }

    // Calculos Core (True Range e DM)
    const upMove = high - state.prevHigh!;
    const downMove = state.prevLow! - low;

    const tr = trueRange(high, low, state.prevClose);

    const dmPlus = upMove > downMove && upMove > 0 ? upMove : 0;
    const dmMinus = downMove > upMove && downMove > 0 ? downMove : 0;

    // Suavizacao RMA (Wilder's Smoothing)
    if (state.smoothTR === null) {
      state.smoothTR = tr;
      state.smoothDMPlus = dmPlus;
      state.smoothDMMinus = dmMinus;
    } else {
      state.smoothTR = state.smoothTR - state.smoothTR / adxLength + tr;
      state.smoothDMPlus =
        state.smoothDMPlus! - state.smoothDMPlus! / adxLength + dmPlus;
      state.smoothDMMinus =
        state.smoothDMMinus! - state.smoothDMMinus! / adxLength + dmMinus;
    }

    // Calculo do DI (Directional Index)
    const diPlus =
      state.smoothTR === 0 ? 0 : (state.smoothDMPlus! / state.smoothTR) * 100;
    const diMinus =
      state.smoothTR === 0 ? 0 : (state.smoothDMMinus! / state.smoothTR) * 100;

    // Logica de Contagem de Tendencia ("Mystic Pulse")
    if (state.prevDIPlus !== null && state.prevDIMinus !== null) {
      // Incremento Positivo: DI+ subindo e maior que DI-
      if (diPlus > state.prevDIPlus && diPlus > diMinus) {
        state.positiveCount++;
        state.negativeCount = 0;
      }
      // Incremento Negativo: DI- subindo e maior que DI+
      else if (diMinus > state.prevDIMinus && diMinus > diPlus) {
        state.negativeCount++;
        state.positiveCount = 0;
      }
      // Se nenhuma condicao for atendida, mantem contador anterior
    }

    // Atualiza referencias
    state.prevClose = close;
    state.prevHigh = high;
    state.prevLow = low;
    state.prevDIPlus = diPlus;
    state.prevDIMinus = diMinus;

    // Calculo do Score
    const trendScore = state.positiveCount - state.negativeCount;

    // Gerenciar historico para normalizacao
    state.scoreHistory.push(Math.abs(trendScore));
    if (state.scoreHistory.length > collectLength) {
      state.scoreHistory.shift();
    }

    // Normalizacao local (Min/Max na janela)
    let intensity = 0;
    if (state.scoreHistory.length > 0) {
      const minVal = Math.min(...state.scoreHistory);
      const maxVal = Math.max(...state.scoreHistory);
      intensity = calculateGammaIntensity(
        Math.abs(trendScore),
        minVal,
        maxVal,
        gamma
      );
    }

    lastResult = {
      positiveCount: state.positiveCount,
      negativeCount: state.negativeCount,
      trendScore,
      isBullish: trendScore >= 0,
      intensity,
      diPlus,
      diMinus,
    };
  }

  return lastResult;
}

/**
 * Calcula Mystic Pulse para todos os candles (serie completa)
 * Retorna array com resultado para cada candle (null para candles iniciais)
 */
export function mysticPulseSeries(
  candles: Candle[],
  adxLength = 9,
  collectLength = 100,
  gamma = 0.7
): (MysticPulseResult | null)[] {
  const results: (MysticPulseResult | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const slicedCandles = candles.slice(0, i + 1);
    results.push(mysticPulse(slicedCandles, adxLength, collectLength, gamma));
  }

  return results;
}
