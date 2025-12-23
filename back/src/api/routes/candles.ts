import type { FastifyInstance } from 'fastify';
import type { Candle, ApiError } from '../../domain/types.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { emaSeries } from '../../engine/indicators/ema.js';
import { SMA_SHORT_PERIOD, SMA_LONG_PERIOD } from '../../domain/constants.js';

interface CandlesResponse {
  ticker: string;
  candles: Candle[];
  indicators: {
    sma20: (number | null)[];
    sma50: (number | null)[];
  };
}

export async function candlesRoutes(app: FastifyInstance) {
  // GET /assets/:ticker/candles - Retorna candles para grafico
  app.get<{
    Params: { ticker: string };
    Querystring: { limit?: string };
    Reply: CandlesResponse | ApiError;
  }>('/assets/:ticker/candles', async (request, reply) => {
    const { ticker } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 60;
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

    // Obter candles (precisamos de mais candles para calcular SMA50)
    const extraCandles = Math.max(SMA_LONG_PERIOD, 50);
    const candles = await getCandlesAsync(normalizedTicker, limit + extraCandles);

    if (!candles || candles.length < SMA_LONG_PERIOD) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes para o ativo ${normalizedTicker}. Minimo necessario: ${SMA_LONG_PERIOD} candles.`,
        statusCode: 422,
      });
    }

    // Extrair closes para calcular indicadores
    const closes = candles.map(c => c.close);

    // Calcular indicadores para todos os candles (EMA)
    const ema20Full = emaSeries(SMA_SHORT_PERIOD, closes);
    const ema50Full = emaSeries(SMA_LONG_PERIOD, closes);

    // Pegar apenas os ultimos N candles (conforme limit)
    const startIndex = Math.max(0, candles.length - limit);
    const candlesSlice = candles.slice(startIndex);
    const ema20Slice = ema20Full.slice(startIndex);
    const ema50Slice = ema50Full.slice(startIndex);

    return {
      ticker: normalizedTicker,
      candles: candlesSlice,
      indicators: {
        sma20: ema20Slice,
        sma50: ema50Slice,
      },
    };
  });
}
