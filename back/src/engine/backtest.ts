import type { Candle, SetupType, Trend } from '../domain/types.js';
import { BACKTEST_FORWARD_CANDLES, BACKTEST_R_MULTIPLIER, ATR_PERIOD } from '../domain/constants.js';
import { atr } from './indicators/atr.js';
import { wasBreakoutActive } from './setups/breakout.js';
import { wasPullbackActive } from './setups/pullback-sma20.js';
import { wasBreakdownActive } from './setups/breakdown.js';
import { calculateTrend } from './context.js';

interface BacktestResult {
  totalOccurrences: number;
  successCount: number;
  successRate: number;
}

/**
 * Avalia se um trade foi bem sucedido
 * Para setups de alta (breakout, pullback): sucesso = +1R antes de -1R
 * Para setups de baixa (breakdown): sucesso = -1R antes de +1R
 */
function evaluateTrade(
  candles: Candle[],
  entryIndex: number,
  isLongSetup: boolean
): boolean {
  const entryCandle = candles[entryIndex];
  const entryPrice = entryCandle.close;

  // Calcular ATR no momento da entrada
  const candlesForAtr = candles.slice(0, entryIndex + 1);
  const atrValue = atr(ATR_PERIOD, candlesForAtr);

  if (atrValue === null) {
    return false;
  }

  const rValue = atrValue * BACKTEST_R_MULTIPLIER;

  // Definir alvos
  let targetPrice: number;
  let stopPrice: number;

  if (isLongSetup) {
    targetPrice = entryPrice + rValue;
    stopPrice = entryPrice - rValue;
  } else {
    // Breakdown - lucro na queda
    targetPrice = entryPrice - rValue;
    stopPrice = entryPrice + rValue;
  }

  // Avaliar candles futuros
  const endIndex = Math.min(entryIndex + BACKTEST_FORWARD_CANDLES, candles.length);

  for (let i = entryIndex + 1; i < endIndex; i++) {
    const candle = candles[i];

    if (isLongSetup) {
      // Para long: high >= target = sucesso, low <= stop = falha
      if (candle.high >= targetPrice) {
        return true;
      }
      if (candle.low <= stopPrice) {
        return false;
      }
    } else {
      // Para short/breakdown: low <= target = sucesso, high >= stop = falha
      if (candle.low <= targetPrice) {
        return true;
      }
      if (candle.high >= stopPrice) {
        return false;
      }
    }
  }

  // Nao atingiu nem alvo nem stop
  return false;
}

/**
 * Executa backtest para um tipo de setup
 */
export function runBacktest(
  candles: Candle[],
  setupType: SetupType
): BacktestResult {
  let totalOccurrences = 0;
  let successCount = 0;

  const isLongSetup = setupType !== 'breakdown';

  // Comeca apos ter dados suficientes para indicadores
  const startIndex = 60; // SMA50 + margem

  for (let i = startIndex; i < candles.length - BACKTEST_FORWARD_CANDLES; i++) {
    let wasActive = false;

    switch (setupType) {
      case 'breakout':
        wasActive = wasBreakoutActive(candles, i);
        break;
      case 'pullback-sma20': {
        // Precisa calcular trend no momento
        const slicedCandles = candles.slice(0, i + 1);
        const trend = calculateTrend(slicedCandles);
        wasActive = wasPullbackActive(candles, i, trend);
        break;
      }
      case 'breakdown':
        wasActive = wasBreakdownActive(candles, i);
        break;
    }

    if (wasActive) {
      totalOccurrences++;
      if (evaluateTrade(candles, i, isLongSetup)) {
        successCount++;
      }
    }
  }

  const successRate =
    totalOccurrences > 0
      ? Math.round((successCount / totalOccurrences) * 100)
      : 50; // Default se nao houver ocorrencias

  return {
    totalOccurrences,
    successCount,
    successRate,
  };
}

/**
 * Cache de resultados de backtest
 */
const backtestCache: Map<string, BacktestResult> = new Map();

/**
 * Obtem taxa de sucesso para um setup (com cache)
 */
export function getSuccessRate(
  ticker: string,
  candles: Candle[],
  setupType: SetupType
): number {
  const cacheKey = `${ticker}-${setupType}`;

  if (backtestCache.has(cacheKey)) {
    return backtestCache.get(cacheKey)!.successRate;
  }

  const result = runBacktest(candles, setupType);
  backtestCache.set(cacheKey, result);

  return result.successRate;
}

/**
 * Limpar cache (util para testes)
 */
export function clearBacktestCache(): void {
  backtestCache.clear();
}
