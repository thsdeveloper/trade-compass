import type { FastifyInstance } from 'fastify';
import type { AnalysisResponse, ApiError, SetupResult } from '../../domain/types.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { calculateContext } from '../../engine/context.js';
import { calculateDecisionZone } from '../../engine/decision-zone.js';
import { detectBreakout } from '../../engine/setups/breakout.js';
import { detectPullbackSma20 } from '../../engine/setups/pullback-sma20.js';
import { detectBreakdown } from '../../engine/setups/breakdown.js';
import { detectMysticPulse } from '../../engine/setups/mystic-pulse.js';
import { getSuccessRate } from '../../engine/backtest.js';

// Minimo de 55 candles (suficiente para SMA50 + margem)
// Nota: Com plano gratuito da brapi, recebemos ~64 candles (3 meses)
const MIN_CANDLES_REQUIRED = 55;

export async function analysisRoutes(app: FastifyInstance) {
  // GET /assets/:ticker/analysis - Analise completa
  app.get<{
    Params: { ticker: string };
    Querystring: { timeframe?: string };
    Reply: AnalysisResponse | ApiError;
  }>('/assets/:ticker/analysis', async (request, reply) => {
    const { ticker } = request.params;
    const normalizedTicker = ticker.toUpperCase().trim();

    // Validar ticker
    const asset = getAsset(normalizedTicker);
    if (!asset) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Ativo ${normalizedTicker} nao encontrado`,
        statusCode: 404,
      });
    }

    // Obter candles (async - busca da brapi)
    const candles = await getCandlesAsync(normalizedTicker);
    if (!candles || candles.length < MIN_CANDLES_REQUIRED) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes para analise. Minimo: ${MIN_CANDLES_REQUIRED} candles, encontrados: ${candles?.length ?? 0}`,
        statusCode: 422,
      });
    }

    // Calcular contexto
    const context = calculateContext(candles);

    // Detectar setups
    const setups: SetupResult[] = [];

    // Breakout
    const breakoutRate = getSuccessRate(normalizedTicker, candles, 'breakout');
    const breakoutSetup = detectBreakout(
      normalizedTicker,
      candles,
      context.volatility,
      breakoutRate
    );
    if (breakoutSetup) {
      setups.push(breakoutSetup);
    }

    // Pullback SMA20
    const pullbackRate = getSuccessRate(normalizedTicker, candles, 'pullback-sma20');
    const pullbackSetup = detectPullbackSma20(
      normalizedTicker,
      candles,
      context.trend,
      context.volume,
      context.volatility,
      pullbackRate
    );
    if (pullbackSetup) {
      setups.push(pullbackSetup);
    }

    // Breakdown
    const breakdownRate = getSuccessRate(normalizedTicker, candles, 'breakdown');
    const breakdownSetup = detectBreakdown(
      normalizedTicker,
      candles,
      context.volatility,
      breakdownRate
    );
    if (breakdownSetup) {
      setups.push(breakdownSetup);
    }

    // Mystic Pulse
    const mysticPulseRate = getSuccessRate(normalizedTicker, candles, 'mystic-pulse');
    const mysticPulseSetup = detectMysticPulse(
      normalizedTicker,
      candles,
      context.trend,
      context.volatility,
      mysticPulseRate
    );
    if (mysticPulseSetup) {
      setups.push(mysticPulseSetup);
    }

    // Calcular zona de decisao
    const decisionZone = calculateDecisionZone({ context, setups });

    // Montar resposta
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
  });
}
