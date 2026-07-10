import type { FastifyInstance } from 'fastify';
import type { Candle, ApiError } from '../../domain/types.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { emaSeries } from '../../engine/indicators/ema.js';
import { macdSeries, type MACDResult } from '../../engine/indicators/macd.js';
import { EMA_SHORT_PERIOD, EMA_LONG_PERIOD } from '../../domain/constants.js';

interface CandlesResponse {
  ticker: string;
  candles: Candle[];
  indicators: {
    ema8: (number | null)[];
    ema80: (number | null)[];
    macd: MACDResult[];
  };
}

export async function candlesRoutes(app: FastifyInstance) {
  // GET /assets/:ticker/candles - Retorna candles para grafico
  app.get<{
    Params: { ticker: string };
    Querystring: { limit?: string; timeframe?: string };
    Reply: CandlesResponse | ApiError;
  }>('/assets/:ticker/candles', async (request, reply) => {
    const { ticker } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 100; // Aumentar default limit
    const timeframe = request.query.timeframe || '1d'; // Default para diario
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

    // Obter candles (precisamos de mais candles para calcular EMA80)
    // Se for 120m, getCandlesAsync ja faz resampling
    const extraCandles = Math.max(EMA_LONG_PERIOD, 80);
    const candles = await getCandlesAsync(normalizedTicker, limit + extraCandles, timeframe);

    if (!candles || candles.length < EMA_LONG_PERIOD) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes para o ativo ${normalizedTicker}. Minimo necessario: ${EMA_LONG_PERIOD} candles.`,
        statusCode: 422,
      });
    }

    // Extrair closes para calcular indicadores
    const closes = candles.map(c => c.close);

    // Calcular indicadores para todos os candles (EMA e MACD)
    const ema8Full = emaSeries(EMA_SHORT_PERIOD, closes);
    const ema80Full = emaSeries(EMA_LONG_PERIOD, closes);
    const macdFull = macdSeries(closes, 12, 26, 9);

    // Pegar apenas os ultimos N candles (conforme limit)
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
  });
}
