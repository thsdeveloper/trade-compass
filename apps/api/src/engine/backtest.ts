import type { Candle, SetupType } from '../domain/types.js';
import { getSignalStatsByType, type SignalStats } from '../data/signal-repository.js';
import type { SetupType as SignalSetupType } from './setups/setup-123-history.js';

export interface BacktestResult {
  totalOccurrences: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  expiredCount: number;
  successRate: number;
}

// Cache de estatisticas em memoria
const statsCache: Map<string, { stats: BacktestResult; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Converte SetupType para SignalSetupType
 */
function toSignalSetupType(setupType: SetupType): SignalSetupType {
  if (setupType === '123-compra' || setupType === '123-venda') {
    return setupType;
  }
  // Fallback para outros tipos (quando implementados)
  return '123-compra';
}

/**
 * Executa backtest assincrono usando dados do banco
 */
export async function runBacktestAsync(
  ticker: string,
  setupType: SetupType
): Promise<BacktestResult> {
  const cacheKey = `${ticker.toUpperCase()}-${setupType}`;

  // Verificar cache
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.stats;
  }

  try {
    const signalType = toSignalSetupType(setupType);
    const dbStats: SignalStats = await getSignalStatsByType(ticker, signalType);

    const result: BacktestResult = {
      totalOccurrences: dbStats.total,
      successCount: dbStats.success,
      failureCount: dbStats.failure,
      pendingCount: dbStats.pending,
      expiredCount: dbStats.expired,
      successRate: dbStats.successRate
    };

    // Atualizar cache
    statsCache.set(cacheKey, { stats: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error(`[backtest] Erro ao buscar stats para ${ticker}/${setupType}:`, error);

    // Retornar resultado vazio em caso de erro
    return {
      totalOccurrences: 0,
      successCount: 0,
      failureCount: 0,
      pendingCount: 0,
      expiredCount: 0,
      successRate: 0
    };
  }
}

/**
 * Versao sincrona para compatibilidade (usa cache)
 * Retorna 0 se nao houver dados em cache
 */
export function runBacktest(
  candles: Candle[],
  setupType: SetupType
): BacktestResult {
  // Esta funcao e mantida para compatibilidade
  // Prefira usar runBacktestAsync
  return {
    totalOccurrences: 0,
    successCount: 0,
    failureCount: 0,
    pendingCount: 0,
    expiredCount: 0,
    successRate: 0
  };
}

/**
 * Obtem taxa de sucesso do cache (sincrono)
 * Retorna 0 se nao houver dados em cache
 */
export function getSuccessRate(
  ticker: string,
  candles: Candle[],
  setupType: SetupType
): number {
  const cacheKey = `${ticker.toUpperCase()}-${setupType}`;
  const cached = statsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.stats.successRate;
  }

  return 0; // Sem dados em cache
}

/**
 * Obtem taxa de sucesso de forma assincrona
 */
export async function getSuccessRateAsync(
  ticker: string,
  setupType: SetupType
): Promise<number> {
  const result = await runBacktestAsync(ticker, setupType);
  return result.successRate;
}

/**
 * Atualiza cache com estatisticas
 */
export function updateStatsCache(
  ticker: string,
  setupType: SetupType,
  stats: BacktestResult
): void {
  const cacheKey = `${ticker.toUpperCase()}-${setupType}`;
  statsCache.set(cacheKey, { stats, timestamp: Date.now() });
}

/**
 * Limpa cache de backtest
 */
export function clearBacktestCache(): void {
  statsCache.clear();
}
