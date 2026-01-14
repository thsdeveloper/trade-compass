import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../lib/supabase.js';
import type { SignalRow, SignalStats } from '../../data/signal-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { detectAllSetup123, calculateSignalStats } from '../../engine/setups/setup-123-history.js';
import { upsertSignals, deleteSignalsByTicker } from '../../data/signal-repository.js';
import { getAsset } from '../../data/asset-repository.js';

const TABLE = 'setup_signals';
const CANDLES_TO_FETCH = 2000;
const TIMEFRAME = '1d';

interface BacktestSummary {
  totalSignals: number;
  totalSuccess: number;
  totalFailure: number;
  totalPending: number;
  totalExpired: number;
  successRate: number;
  avgCandlesToResolve: number;
  profitFactor: number;
  totalReturnPct: number;    // Retorno total acumulado %
  avgReturnPct: number;      // Retorno médio por operação %
  avgWinPct: number;         // Ganho médio % (só vencedoras)
  avgLossPct: number;        // Perda média % (só perdedoras)
  bySetupType: {
    '123-compra': SignalStats;
    '123-venda': SignalStats;
  };
  byTicker: Record<string, SignalStats>;
}

interface BacktestResponse {
  summary: BacktestSummary;
  operations: SignalRow[];
}

/**
 * Busca todos os sinais do banco
 */
async function getAllSignals(limit: number = 1000): Promise<SignalRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .order('signal_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao buscar sinais: ${error.message}`);
  }

  return data || [];
}

/**
 * Calcula o retorno percentual de uma operação
 * Para COMPRA: (resolved - entry) / entry * 100
 * Para VENDA: (entry - resolved) / entry * 100 (invertido)
 */
function calculateReturnPct(signal: SignalRow): number | null {
  if (signal.resolved_price === null) return null;
  if (signal.status !== 'success' && signal.status !== 'failure') return null;

  const entry = Number(signal.entry_price);
  const resolved = Number(signal.resolved_price);

  if (entry === 0) return null;

  // Para operações de VENDA, o lucro é quando o preço CAI
  if (signal.setup_type === '123-venda') {
    return ((entry - resolved) / entry) * 100;
  }

  // Para operações de COMPRA, o lucro é quando o preço SOBE
  return ((resolved - entry) / entry) * 100;
}

/**
 * Calcula resumo do backtest a partir dos sinais
 */
function calculateSummary(signals: SignalRow[]): BacktestSummary {
  const summary: BacktestSummary = {
    totalSignals: signals.length,
    totalSuccess: 0,
    totalFailure: 0,
    totalPending: 0,
    totalExpired: 0,
    successRate: 0,
    avgCandlesToResolve: 0,
    profitFactor: 0,
    totalReturnPct: 0,
    avgReturnPct: 0,
    avgWinPct: 0,
    avgLossPct: 0,
    bySetupType: {
      '123-compra': { total: 0, success: 0, failure: 0, pending: 0, expired: 0, successRate: 0 },
      '123-venda': { total: 0, success: 0, failure: 0, pending: 0, expired: 0, successRate: 0 },
    },
    byTicker: {},
  };

  let totalCandlesToResolve = 0;
  let resolvedCount = 0;

  // Variáveis para métricas percentuais
  let totalReturnPct = 0;
  let countWithReturn = 0;
  let totalWinPct = 0;
  let winCount = 0;
  let totalLossPct = 0;
  let lossCount = 0;

  for (const signal of signals) {
    // Contadores gerais
    switch (signal.status) {
      case 'success':
        summary.totalSuccess++;
        break;
      case 'failure':
        summary.totalFailure++;
        break;
      case 'pending':
        summary.totalPending++;
        break;
      case 'expired':
        summary.totalExpired++;
        break;
    }

    // Por tipo de setup
    const setupType = signal.setup_type as '123-compra' | '123-venda';
    if (summary.bySetupType[setupType]) {
      summary.bySetupType[setupType].total++;
      summary.bySetupType[setupType][signal.status]++;
    }

    // Por ticker
    if (!summary.byTicker[signal.ticker]) {
      summary.byTicker[signal.ticker] = {
        total: 0,
        success: 0,
        failure: 0,
        pending: 0,
        expired: 0,
        successRate: 0,
      };
    }
    summary.byTicker[signal.ticker].total++;
    summary.byTicker[signal.ticker][signal.status]++;

    // Media de candles para resolver
    if (signal.candles_to_resolve !== null) {
      totalCandlesToResolve += signal.candles_to_resolve;
      resolvedCount++;
    }

    // Calcular retorno percentual
    const returnPct = calculateReturnPct(signal);
    if (returnPct !== null) {
      totalReturnPct += returnPct;
      countWithReturn++;

      if (signal.status === 'success') {
        totalWinPct += returnPct;
        winCount++;
      } else if (signal.status === 'failure') {
        totalLossPct += returnPct;
        lossCount++;
      }
    }
  }

  // Calcular taxas de sucesso
  const totalResolved = summary.totalSuccess + summary.totalFailure;
  summary.successRate = totalResolved > 0
    ? (summary.totalSuccess / totalResolved) * 100
    : 0;

  // Profit factor (simplificado: wins/losses)
  summary.profitFactor = summary.totalFailure > 0
    ? summary.totalSuccess / summary.totalFailure
    : summary.totalSuccess;

  // Media de candles
  summary.avgCandlesToResolve = resolvedCount > 0
    ? totalCandlesToResolve / resolvedCount
    : 0;

  // Métricas percentuais
  summary.totalReturnPct = totalReturnPct;
  summary.avgReturnPct = countWithReturn > 0 ? totalReturnPct / countWithReturn : 0;
  summary.avgWinPct = winCount > 0 ? totalWinPct / winCount : 0;
  summary.avgLossPct = lossCount > 0 ? totalLossPct / lossCount : 0;

  // Taxa de sucesso por setup type
  for (const type of ['123-compra', '123-venda'] as const) {
    const s = summary.bySetupType[type];
    const resolved = s.success + s.failure;
    s.successRate = resolved > 0 ? (s.success / resolved) * 100 : 0;
  }

  // Taxa de sucesso por ticker
  for (const ticker in summary.byTicker) {
    const s = summary.byTicker[ticker];
    const resolved = s.success + s.failure;
    s.successRate = resolved > 0 ? (s.success / resolved) * 100 : 0;
  }

  return summary;
}

export async function backtestRoutes(app: FastifyInstance) {
  /**
   * GET /backtest
   * Retorna dados completos do backtest (resumo + operacoes)
   */
  app.get<{
    Querystring: { limit?: number; ticker?: string; setupType?: string };
  }>('/backtest', async (request, reply) => {
    const limit = request.query.limit || 1000;
    const { ticker, setupType } = request.query;

    try {
      let signals = await getAllSignals(limit);

      // Filtrar por ticker se especificado
      if (ticker) {
        signals = signals.filter(s => s.ticker === ticker.toUpperCase());
      }

      // Filtrar por tipo de setup se especificado
      if (setupType) {
        signals = signals.filter(s => s.setup_type === setupType);
      }

      const summary = calculateSummary(signals);

      const response: BacktestResponse = {
        summary,
        operations: signals,
      };

      return response;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Erro ao buscar backtest',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /backtest/summary
   * Retorna apenas o resumo (mais leve)
   */
  app.get<{
    Querystring: { ticker?: string; setupType?: string };
  }>('/backtest/summary', async (request, reply) => {
    const { ticker, setupType } = request.query;

    try {
      let signals = await getAllSignals(10000);

      if (ticker) {
        signals = signals.filter(s => s.ticker === ticker.toUpperCase());
      }

      if (setupType) {
        signals = signals.filter(s => s.setup_type === setupType);
      }

      const summary = calculateSummary(signals);

      return { summary };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Erro ao buscar resumo',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /backtest/generate/:ticker
   * Gera backtest para um ativo especifico
   */
  app.post<{
    Params: { ticker: string };
  }>('/backtest/generate/:ticker', async (request, reply) => {
    const { ticker } = request.params;
    const normalizedTicker = ticker.toUpperCase();

    // Verificar se o ativo existe
    const asset = getAsset(normalizedTicker);
    if (!asset) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Ativo ${normalizedTicker} nao encontrado`,
        statusCode: 404,
      });
    }

    try {
      app.log.info(`[backtest] Gerando backtest para ${normalizedTicker}...`);

      // Buscar candles historicos
      const candles = await getCandlesAsync(normalizedTicker, CANDLES_TO_FETCH, TIMEFRAME);

      if (!candles || candles.length < 100) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Dados insuficientes para ${normalizedTicker} (${candles?.length || 0} candles)`,
          statusCode: 400,
        });
      }

      app.log.info(`[backtest] ${normalizedTicker}: ${candles.length} candles carregados`);

      // Detectar todos os sinais
      const signals = detectAllSetup123(normalizedTicker, candles, TIMEFRAME);
      const stats = calculateSignalStats(signals);

      app.log.info(`[backtest] ${normalizedTicker}: ${signals.length} sinais detectados`);
      app.log.info(`[backtest] ${normalizedTicker}: Taxa de sucesso: ${stats.successRate.toFixed(1)}%`);

      // Limpar sinais antigos e inserir novos
      await deleteSignalsByTicker(normalizedTicker);
      const inserted = await upsertSignals(signals);

      app.log.info(`[backtest] ${normalizedTicker}: ${inserted} sinais persistidos`);

      return {
        ticker: normalizedTicker,
        success: true,
        signalsGenerated: signals.length,
        stats: {
          total: stats.total,
          success: stats.success,
          failure: stats.failure,
          pending: stats.pending,
          expired: stats.expired,
          successRate: stats.successRate,
        },
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Erro ao gerar backtest',
        statusCode: 500,
      });
    }
  });
}
