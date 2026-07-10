import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { getAssets, getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { calculateContext } from '../../engine/context.js';
import { calculateDecisionZone } from '../../engine/decision-zone.js';
import { detectSetup123 } from '../../engine/setups/setup-123.js';
import { runBacktestAsync } from '../../engine/backtest.js';
import { emaSeries } from '../../engine/indicators/ema.js';
import { macdSeries } from '../../engine/indicators/macd.js';
import { mysticPulseSeries } from '../../engine/indicators/mystic-pulse.js';
import { EMA_SHORT_PERIOD, EMA_LONG_PERIOD } from '../../domain/constants.js';
import {
  MYSTIC_PULSE_ADX_LENGTH,
  MYSTIC_PULSE_COLLECT_LENGTH,
  MYSTIC_PULSE_GAMMA,
} from '../../domain/constants.js';
import {
  getSignalsByTickerAndTimeframe,
  getSignalStats,
  getSignalStatsByType,
} from '../../data/signal-repository.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { detectAllSetup123, calculateSignalStats } from '../../engine/setups/setup-123-history.js';
import { upsertSignals, deleteSignalsByTicker } from '../../data/signal-repository.js';
import type { SetupResult, SetupType, MysticPulseDataPoint } from '../../domain/types.js';

const MIN_CANDLES_REQUIRED = 85;
const TABLE = 'setup_signals';
const CANDLES_TO_FETCH = 2000;
const TIMEFRAME = '1d';

export const marketRouter = router({
  // GET /assets - Lista todos os ativos
  assets: publicProcedure.query(() => {
    return getAssets();
  }),

  // GET /assets/:ticker/summary - Resumo do ativo
  summary: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const normalizedTicker = input.ticker.toUpperCase().trim();

      const asset = getAsset(normalizedTicker);
      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      const candles = await getCandlesAsync(normalizedTicker, 1);
      if (!candles || candles.length === 0) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: `Dados insuficientes para o ativo ${normalizedTicker}`,
        });
      }

      const lastCandle = candles[candles.length - 1];

      return {
        ticker: asset.ticker,
        name: asset.name,
        price: lastCandle.close,
        updatedAt: lastCandle.time,
      };
    }),

  // GET /assets/:ticker/analysis - Análise completa
  analysis: publicProcedure
    .input(
      z.object({
        ticker: z.string(),
        timeframe: z.string().optional().default('1d'),
      })
    )
    .query(async ({ input }) => {
      const normalizedTicker = input.ticker.toUpperCase().trim();
      const targetTimeframe = input.timeframe;

      const asset = getAsset(normalizedTicker);
      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      const candles = await getCandlesAsync(normalizedTicker, 300, targetTimeframe);

      if (!candles || candles.length < MIN_CANDLES_REQUIRED) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: `Dados insuficientes para análise em ${targetTimeframe}. Mínimo: ${MIN_CANDLES_REQUIRED} candles, encontrados: ${candles?.length ?? 0}`,
        });
      }

      const context = calculateContext(candles);
      const setups: SetupResult[] = [];

      const setup123 = detectSetup123(normalizedTicker, candles);
      if (setup123) {
        try {
          const backtest = await runBacktestAsync(normalizedTicker, setup123.id as SetupType);
          setup123.successRate = Math.round(backtest.successRate);
        } catch {
          // Keep original successRate
        }
        setups.push(setup123);
      }

      const decisionZone = calculateDecisionZone({ context, setups });
      const lastCandle = candles[candles.length - 1];

      return {
        summary: {
          ticker: asset.ticker,
          name: asset.name,
          price: lastCandle.close,
          updatedAt: lastCandle.time,
        },
        context,
        decisionZone,
        setups,
      };
    }),

  // GET /assets/:ticker/candles - Retorna candles para gráfico
  candles: publicProcedure
    .input(
      z.object({
        ticker: z.string(),
        limit: z.number().optional().default(100),
        timeframe: z.string().optional().default('1d'),
      })
    )
    .query(async ({ input }) => {
      const normalizedTicker = input.ticker.toUpperCase().trim();
      const { limit, timeframe } = input;

      const asset = getAsset(normalizedTicker);
      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      const extraCandles = Math.max(EMA_LONG_PERIOD, 80);
      const candles = await getCandlesAsync(normalizedTicker, limit + extraCandles, timeframe);

      if (!candles || candles.length < EMA_LONG_PERIOD) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: `Dados insuficientes para o ativo ${normalizedTicker}. Mínimo necessário: ${EMA_LONG_PERIOD} candles.`,
        });
      }

      const closes = candles.map((c) => c.close);
      const ema8Full = emaSeries(EMA_SHORT_PERIOD, closes);
      const ema80Full = emaSeries(EMA_LONG_PERIOD, closes);
      const macdFull = macdSeries(closes, 12, 26, 9);

      const startIndex = Math.max(0, candles.length - limit);
      const candlesSlice = candles.slice(startIndex);
      const ema8Slice = ema8Full.slice(startIndex);
      const ema80Slice = ema80Full.slice(startIndex);
      const macdSlice = macdFull.slice(startIndex);

      return {
        ticker: normalizedTicker,
        candles: candlesSlice,
        indicators: {
          ema8: ema8Slice,
          ema80: ema80Slice,
          macd: macdSlice,
        },
      };
    }),

  // GET /assets/:ticker/signals - Lista sinais históricos
  signals: publicProcedure
    .input(
      z.object({
        ticker: z.string(),
        limit: z.number().optional().default(100),
        timeframe: z.string().optional().default('1d'),
      })
    )
    .query(async ({ input }) => {
      const { ticker, limit, timeframe } = input;

      const [signals, stats] = await Promise.all([
        getSignalsByTickerAndTimeframe(ticker, timeframe, limit),
        getSignalStats(ticker),
      ]);

      return {
        ticker: ticker.toUpperCase(),
        timeframe,
        signals,
        stats,
      };
    }),

  // GET /assets/:ticker/signals/stats - Estatísticas de sinais
  signalStats: publicProcedure
    .input(
      z.object({
        ticker: z.string(),
        setupType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { ticker, setupType } = input;

      const stats = setupType
        ? await getSignalStatsByType(ticker, setupType as any)
        : await getSignalStats(ticker);

      return {
        ticker: ticker.toUpperCase(),
        stats,
      };
    }),

  // GET /assets/:ticker/mystic-pulse/series - Série do Mystic Pulse
  mysticPulse: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const normalizedTicker = input.ticker.toUpperCase().trim();

      const asset = getAsset(normalizedTicker);
      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      const candles = await getCandlesAsync(normalizedTicker);
      if (!candles || candles.length < 20) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: `Dados insuficientes. Mínimo: 20 candles, encontrados: ${candles?.length ?? 0}`,
        });
      }

      const series = mysticPulseSeries(
        candles,
        MYSTIC_PULSE_ADX_LENGTH,
        MYSTIC_PULSE_COLLECT_LENGTH,
        MYSTIC_PULSE_GAMMA
      );

      const data: MysticPulseDataPoint[] = [];

      for (let i = 0; i < candles.length; i++) {
        const pulse = series[i];
        if (pulse) {
          data.push({
            time: candles[i].time,
            positiveCount: pulse.positiveCount,
            negativeCount: pulse.negativeCount,
            trendScore: pulse.trendScore,
            intensity: Math.round(pulse.intensity * 100) / 100,
            diPlus: Math.round(pulse.diPlus * 100) / 100,
            diMinus: Math.round(pulse.diMinus * 100) / 100,
            isBullish: pulse.isBullish,
          });
        } else {
          data.push({
            time: candles[i].time,
            positiveCount: 0,
            negativeCount: 0,
            trendScore: 0,
            intensity: 0,
            diPlus: 0,
            diMinus: 0,
            isBullish: true,
          });
        }
      }

      return {
        ticker: normalizedTicker,
        data,
      };
    }),

  // GET /backtest - Dados completos do backtest
  backtest: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(1000),
        ticker: z.string().optional(),
        setupType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, ticker, setupType } = input;

      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('signal_time', { ascending: false })
        .limit(limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao buscar sinais: ${error.message}`,
        });
      }

      let signals = data || [];

      if (ticker) {
        signals = signals.filter((s) => s.ticker === ticker.toUpperCase());
      }

      if (setupType) {
        signals = signals.filter((s) => s.setup_type === setupType);
      }

      const summary = calculateBacktestSummary(signals);

      return {
        summary,
        operations: signals,
      };
    }),

  // GET /backtest/summary - Resumo do backtest
  backtestSummary: publicProcedure
    .input(
      z.object({
        ticker: z.string().optional(),
        setupType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { ticker, setupType } = input;

      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('signal_time', { ascending: false })
        .limit(10000);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao buscar sinais: ${error.message}`,
        });
      }

      let signals = data || [];

      if (ticker) {
        signals = signals.filter((s) => s.ticker === ticker.toUpperCase());
      }

      if (setupType) {
        signals = signals.filter((s) => s.setup_type === setupType);
      }

      const summary = calculateBacktestSummary(signals);

      return { summary };
    }),

  // POST /backtest/generate/:ticker - Gera backtest para um ativo
  generateBacktest: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .mutation(async ({ input }) => {
      const normalizedTicker = input.ticker.toUpperCase();

      const asset = getAsset(normalizedTicker);
      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      const candles = await getCandlesAsync(normalizedTicker, CANDLES_TO_FETCH, TIMEFRAME);

      if (!candles || candles.length < 100) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Dados insuficientes para ${normalizedTicker} (${candles?.length || 0} candles)`,
        });
      }

      const signals = detectAllSetup123(normalizedTicker, candles, TIMEFRAME);
      const stats = calculateSignalStats(signals);

      await deleteSignalsByTicker(normalizedTicker);
      await upsertSignals(signals);

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
    }),
});

// Helper function to calculate backtest summary
function calculateBacktestSummary(signals: any[]) {
  const summary = {
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
    } as Record<string, { total: number; success: number; failure: number; pending: number; expired: number; successRate: number }>,
    byTicker: {} as Record<string, { total: number; success: number; failure: number; pending: number; expired: number; successRate: number }>,
  };

  let totalCandlesToResolve = 0;
  let resolvedCount = 0;
  let totalReturnPct = 0;
  let countWithReturn = 0;
  let totalWinPct = 0;
  let winCount = 0;
  let totalLossPct = 0;
  let lossCount = 0;

  for (const signal of signals) {
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

    const setupType = signal.setup_type as '123-compra' | '123-venda';
    if (summary.bySetupType[setupType]) {
      summary.bySetupType[setupType].total++;
      (summary.bySetupType[setupType] as any)[signal.status]++;
    }

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
    (summary.byTicker[signal.ticker] as any)[signal.status]++;

    if (signal.candles_to_resolve !== null) {
      totalCandlesToResolve += signal.candles_to_resolve;
      resolvedCount++;
    }

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

  const totalResolved = summary.totalSuccess + summary.totalFailure;
  summary.successRate = totalResolved > 0 ? (summary.totalSuccess / totalResolved) * 100 : 0;
  summary.profitFactor =
    summary.totalFailure > 0 ? summary.totalSuccess / summary.totalFailure : summary.totalSuccess;
  summary.avgCandlesToResolve = resolvedCount > 0 ? totalCandlesToResolve / resolvedCount : 0;
  summary.totalReturnPct = totalReturnPct;
  summary.avgReturnPct = countWithReturn > 0 ? totalReturnPct / countWithReturn : 0;
  summary.avgWinPct = winCount > 0 ? totalWinPct / winCount : 0;
  summary.avgLossPct = lossCount > 0 ? totalLossPct / lossCount : 0;

  for (const type of ['123-compra', '123-venda'] as const) {
    const s = summary.bySetupType[type];
    const resolved = s.success + s.failure;
    s.successRate = resolved > 0 ? (s.success / resolved) * 100 : 0;
  }

  for (const ticker in summary.byTicker) {
    const s = summary.byTicker[ticker];
    const resolved = s.success + s.failure;
    s.successRate = resolved > 0 ? (s.success / resolved) * 100 : 0;
  }

  return summary;
}

function calculateReturnPct(signal: any): number | null {
  if (signal.resolved_price === null) return null;
  if (signal.status !== 'success' && signal.status !== 'failure') return null;

  const entry = Number(signal.entry_price);
  const resolved = Number(signal.resolved_price);

  if (entry === 0) return null;

  if (signal.setup_type === '123-venda') {
    return ((entry - resolved) / entry) * 100;
  }

  return ((resolved - entry) / entry) * 100;
}
