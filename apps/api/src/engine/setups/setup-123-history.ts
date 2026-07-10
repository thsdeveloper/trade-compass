import { Candle } from '../../domain/types.js';
import { emaSeries } from '../indicators/ema.js';
import { macdSeries } from '../indicators/macd.js';

/**
 * Deteccao historica de TODOS os sinais do Setup 123
 *
 * Usado para:
 * - Popular banco de dados com sinais historicos
 * - Calcular taxa de sucesso real para backtest
 * - Exibir multiplos sinais no grafico
 */

// Configuracoes
const MAX_CANDLES_TO_RESOLVE = 50; // Expira se nao resolver em 50 candles
const FIBONACCI_TARGET = 1.618; // Alvo em 161.8% do risco

export type SignalStatus = 'pending' | 'success' | 'failure' | 'expired';
export type SetupType = '123-compra' | '123-venda';

export interface HistoricalSignal {
  ticker: string;
  setupType: SetupType;
  timeframe: string;
  signalTime: string;         // ISO timestamp do candle P3
  p1Index: number;
  p2Index: number;
  p3Index: number;
  p1Price: number;            // Low para compra, High para venda
  p2Price: number;            // Stop price
  p3Price: number;
  entryPrice: number;         // Preco de entrada (rompimento)
  stopPrice: number;          // Stop loss
  targetPrice: number;        // Alvo 161.8% Fibonacci
  status: SignalStatus;
  resolvedAt?: string;        // ISO timestamp da resolucao
  resolvedPrice?: number;     // Preco de resolucao
  candlesToResolve?: number;  // Quantos candles levou para resolver
}

/**
 * Detecta padroes 123 em uma serie de candles respeitando a regra:
 * - Apenas UM sinal por vez (nao pode abrir nova posicao enquanto a anterior estiver aberta)
 * - Novo sinal so e aceito apos o anterior ser finalizado (TP ou SL)
 * - Se a entrada nao foi acionada (expired), pode aceitar novo sinal imediatamente
 */
export function detectAllSetup123(
  ticker: string,
  candles: Candle[],
  timeframe: string = '1d'
): HistoricalSignal[] {
  // Minimo: 80 candles para EMA80 + 3 candles para padrao
  if (candles.length < 83) return [];

  const closes = candles.map(c => c.close);
  const ema8 = emaSeries(8, closes);
  const ema80 = emaSeries(80, closes);
  const macdValues = macdSeries(closes, 12, 26, 9);

  const signals: HistoricalSignal[] = [];

  // Indice a partir do qual podemos aceitar novos sinais
  // Comeca em 0 (sem posicao aberta)
  let nextAllowedIndex = 0;

  // Iterar por todos os candles possiveis (a partir do indice 79 para ter EMA80)
  // Precisamos de 3 candles consecutivos, entao comecamos em i e usamos i+1, i+2
  for (let i = 79; i < candles.length - 2; i++) {
    // Se ainda estamos em uma posicao aberta, pular
    if (i < nextAllowedIndex) {
      continue;
    }

    const c1 = candles[i];
    const c2 = candles[i + 1];
    const c3 = candles[i + 2];

    // Verificar tendencia no momento do padrao (usar indice do P3)
    const p3Ema8 = ema8[i + 2];
    const p3Ema80 = ema80[i + 2];

    if (p3Ema8 === null || p3Ema80 === null) continue;

    const isUptrend = p3Ema8 > p3Ema80;
    const isDowntrend = p3Ema8 < p3Ema80;

    let signalFound = false;

    // Padrao 123 de COMPRA (tendencia de ALTA): minimas formam V
    if (isUptrend && c2.low < c1.low && c3.low > c2.low) {
      // FILTRO MACD: histograma deve ser positivo para compra
      const macdHist = macdValues[i + 2]?.histogram;
      if (macdHist === null || macdHist === undefined || macdHist <= 0) {
        continue; // Pular sinal - MACD nao confirma momentum de alta
      }

      const entryPrice = c3.high;
      const stopPrice = c2.low;
      const riskDistance = entryPrice - stopPrice;
      const targetPrice = entryPrice + (riskDistance * FIBONACCI_TARGET);

      const signal: HistoricalSignal = {
        ticker: ticker.toUpperCase(),
        setupType: '123-compra',
        timeframe,
        signalTime: c3.time,
        p1Index: i,
        p2Index: i + 1,
        p3Index: i + 2,
        p1Price: c1.low,
        p2Price: c2.low,
        p3Price: c3.low,
        entryPrice,
        stopPrice,
        targetPrice,
        status: 'pending'
      };

      // Avaliar resultado e obter indice de resolucao
      const resolvedIndex = evaluateSignal(signal, candles, i + 2, 'BUY');
      signals.push(signal);
      signalFound = true;

      // Atualizar proximo indice permitido
      // Se a entrada foi acionada (success, failure, ou pending), bloquear ate resolver
      // Se nao foi acionada (expired com candlesToResolve = 1), liberar imediatamente
      if (signal.status === 'expired' && signal.candlesToResolve === 1) {
        // Entrada nao acionada - proximo sinal pode ser no candle seguinte ao P3
        nextAllowedIndex = i + 3;
      } else if (resolvedIndex !== null) {
        // Posicao foi aberta - proximo sinal so apos resolucao
        nextAllowedIndex = resolvedIndex + 1;
      } else {
        // Posicao ainda aberta (pending) - bloquear ate o fim
        nextAllowedIndex = candles.length;
      }
    }

    // Padrao 123 de VENDA (tendencia de BAIXA): maximas formam ^
    // So verificar se nao encontrou padrao de compra no mesmo candle
    if (!signalFound && isDowntrend && c2.high > c1.high && c3.high < c2.high) {
      // FILTRO MACD: histograma deve ser negativo para venda
      const macdHist = macdValues[i + 2]?.histogram;
      if (macdHist === null || macdHist === undefined || macdHist >= 0) {
        continue; // Pular sinal - MACD nao confirma momentum de baixa
      }

      const entryPrice = c3.low;
      const stopPrice = c2.high;
      const riskDistance = stopPrice - entryPrice;
      const targetPrice = entryPrice - (riskDistance * FIBONACCI_TARGET);

      const signal: HistoricalSignal = {
        ticker: ticker.toUpperCase(),
        setupType: '123-venda',
        timeframe,
        signalTime: c3.time,
        p1Index: i,
        p2Index: i + 1,
        p3Index: i + 2,
        p1Price: c1.high,
        p2Price: c2.high,
        p3Price: c3.high,
        entryPrice,
        stopPrice,
        targetPrice,
        status: 'pending'
      };

      // Avaliar resultado e obter indice de resolucao
      const resolvedIndex = evaluateSignal(signal, candles, i + 2, 'SELL');
      signals.push(signal);

      // Atualizar proximo indice permitido
      if (signal.status === 'expired' && signal.candlesToResolve === 1) {
        // Entrada nao acionada - proximo sinal pode ser no candle seguinte ao P3
        nextAllowedIndex = i + 3;
      } else if (resolvedIndex !== null) {
        // Posicao foi aberta - proximo sinal so apos resolucao
        nextAllowedIndex = resolvedIndex + 1;
      } else {
        // Posicao ainda aberta (pending) - bloquear ate o fim
        nextAllowedIndex = candles.length;
      }
    }
  }

  return signals;
}

/**
 * Avalia o resultado de um sinal verificando candles subsequentes
 *
 * Regras IMPORTANTES:
 * 1. A entrada so e acionada se o PROXIMO candle romper o preco de entrada:
 *    - BUY: candle.high >= entryPrice (rompe maxima do P3)
 *    - SELL: candle.low <= entryPrice (rompe minima do P3)
 * 2. Se o candle seguinte NAO atingir o preco de entrada, o setup e "expired" (nao executado)
 * 3. Se a entrada for acionada, verificar TP/SL:
 *    - BUY: success se high >= target, failure se low <= stop
 *    - SELL: success se low <= target, failure se high >= stop
 * 4. expired: se nao resolver em MAX_CANDLES_TO_RESOLVE candles
 * 5. pending: se ainda nao tiver candles suficientes para resolver
 *
 * @returns Indice do candle onde a posicao foi fechada, ou null se ainda pendente
 */
function evaluateSignal(
  signal: HistoricalSignal,
  candles: Candle[],
  p3Index: number,
  type: 'BUY' | 'SELL'
): number | null {
  // Verificar se ha candle apos P3
  if (p3Index + 1 >= candles.length) {
    // Nao ha candle para avaliar ainda - permanece pending
    return null;
  }

  const entryCandle = candles[p3Index + 1];

  // PASSO 1: Verificar se a entrada foi acionada no candle seguinte ao P3
  const entryTriggered = type === 'BUY'
    ? entryCandle.high >= signal.entryPrice
    : entryCandle.low <= signal.entryPrice;

  if (!entryTriggered) {
    // Entrada NAO foi acionada - setup nao executado
    signal.status = 'expired';
    signal.resolvedAt = entryCandle.time;
    signal.candlesToResolve = 1;
    return p3Index + 1; // Resolveu no candle seguinte ao P3
  }

  // PASSO 2: Entrada foi acionada - agora verificar TP/SL
  // O proprio candle de entrada pode ter atingido TP ou SL
  const maxIndex = Math.min(
    candles.length - 1,
    p3Index + 1 + MAX_CANDLES_TO_RESOLVE
  );

  for (let j = p3Index + 1; j <= maxIndex; j++) {
    const candle = candles[j];

    if (type === 'BUY') {
      // Verificar stop primeiro (assumindo que stop foi atingido antes do target no mesmo candle)
      if (candle.low <= signal.stopPrice) {
        signal.status = 'failure';
        signal.resolvedAt = candle.time;
        signal.resolvedPrice = signal.stopPrice;
        signal.candlesToResolve = j - p3Index;
        return j; // Retorna indice onde fechou
      }
      // Verificar target
      if (candle.high >= signal.targetPrice) {
        signal.status = 'success';
        signal.resolvedAt = candle.time;
        signal.resolvedPrice = signal.targetPrice;
        signal.candlesToResolve = j - p3Index;
        return j; // Retorna indice onde fechou
      }
    } else {
      // SELL
      // Verificar stop primeiro
      if (candle.high >= signal.stopPrice) {
        signal.status = 'failure';
        signal.resolvedAt = candle.time;
        signal.resolvedPrice = signal.stopPrice;
        signal.candlesToResolve = j - p3Index;
        return j; // Retorna indice onde fechou
      }
      // Verificar target
      if (candle.low <= signal.targetPrice) {
        signal.status = 'success';
        signal.resolvedAt = candle.time;
        signal.resolvedPrice = signal.targetPrice;
        signal.candlesToResolve = j - p3Index;
        return j; // Retorna indice onde fechou
      }
    }
  }

  // Se chegou ate aqui, verificar se expirou ou ainda esta pendente
  if (candles.length > p3Index + 1 + MAX_CANDLES_TO_RESOLVE) {
    // Passou de MAX_CANDLES_TO_RESOLVE sem resolver - expira
    signal.status = 'expired';
    signal.candlesToResolve = MAX_CANDLES_TO_RESOLVE;
    return p3Index + 1 + MAX_CANDLES_TO_RESOLVE; // Expirou apos MAX candles
  }

  // Caso contrario, permanece 'pending'
  return null;
}

/**
 * Calcula estatisticas de sinais
 */
export function calculateSignalStats(signals: HistoricalSignal[]): {
  total: number;
  success: number;
  failure: number;
  pending: number;
  expired: number;
  successRate: number;
  avgCandlesToResolve: number;
} {
  const stats = {
    total: signals.length,
    success: 0,
    failure: 0,
    pending: 0,
    expired: 0,
    successRate: 0,
    avgCandlesToResolve: 0
  };

  let totalCandlesToResolve = 0;
  let resolvedCount = 0;

  for (const signal of signals) {
    stats[signal.status]++;

    if (signal.candlesToResolve !== undefined) {
      totalCandlesToResolve += signal.candlesToResolve;
      resolvedCount++;
    }
  }

  const resolved = stats.success + stats.failure;
  stats.successRate = resolved > 0 ? (stats.success / resolved) * 100 : 0;
  stats.avgCandlesToResolve = resolvedCount > 0 ? totalCandlesToResolve / resolvedCount : 0;

  return stats;
}
