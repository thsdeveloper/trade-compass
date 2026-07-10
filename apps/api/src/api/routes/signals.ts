import type { FastifyInstance } from 'fastify';
import {
  getSignalsByTickerAndTimeframe,
  getSignalStats,
  getSignalStatsByType,
  type SignalRow,
  type SignalStats
} from '../../data/signal-repository.js';
import type { SetupType } from '../../engine/setups/setup-123-history.js';

interface SignalsResponse {
  ticker: string;
  timeframe: string;
  signals: SignalRow[];
  stats: SignalStats;
}

interface StatsResponse {
  ticker: string;
  stats: SignalStats;
}

export async function signalsRoutes(app: FastifyInstance) {
  /**
   * GET /assets/:ticker/signals
   * Lista sinais historicos de um ativo com estatisticas
   */
  app.get<{
    Params: { ticker: string };
    Querystring: { limit?: number; timeframe?: string };
  }>('/assets/:ticker/signals', async (request, reply) => {
    const { ticker } = request.params;
    const limit = request.query.limit || 100;
    const timeframe = request.query.timeframe || '1d';

    try {
      const [signals, stats] = await Promise.all([
        getSignalsByTickerAndTimeframe(ticker, timeframe, limit),
        getSignalStats(ticker)
      ]);

      const response: SignalsResponse = {
        ticker: ticker.toUpperCase(),
        timeframe,
        signals,
        stats
      };

      return response;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Erro ao buscar sinais',
        statusCode: 500
      });
    }
  });

  /**
   * GET /assets/:ticker/signals/stats
   * Retorna apenas estatisticas de sinais (mais leve)
   */
  app.get<{
    Params: { ticker: string };
    Querystring: { setupType?: SetupType };
  }>('/assets/:ticker/signals/stats', async (request, reply) => {
    const { ticker } = request.params;
    const { setupType } = request.query;

    try {
      const stats = setupType
        ? await getSignalStatsByType(ticker, setupType)
        : await getSignalStats(ticker);

      const response: StatsResponse = {
        ticker: ticker.toUpperCase(),
        stats
      };

      return response;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Erro ao buscar estatisticas',
        statusCode: 500
      });
    }
  });
}
