import type { FastifyInstance } from 'fastify';
import type { Asset, AssetSummary, ApiError } from '../../domain/types.js';
import { getAssets, getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';

export async function assetsRoutes(app: FastifyInstance) {
  // GET /assets - Lista todos os ativos
  app.get<{
    Reply: Asset[];
  }>('/assets', async () => {
    return getAssets();
  });

  // GET /assets/:ticker/summary - Resumo do ativo
  app.get<{
    Params: { ticker: string };
    Reply: AssetSummary | ApiError;
  }>('/assets/:ticker/summary', async (request, reply) => {
    const { ticker } = request.params;
    const normalizedTicker = ticker.toUpperCase().trim();

    const asset = getAsset(normalizedTicker);
    if (!asset) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Ativo ${normalizedTicker} nao encontrado`,
        statusCode: 404,
      });
    }

    const candles = await getCandlesAsync(normalizedTicker, 1);
    if (!candles || candles.length === 0) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes para o ativo ${normalizedTicker}`,
        statusCode: 422,
      });
    }

    const lastCandle = candles[candles.length - 1];

    return {
      ticker: asset.ticker,
      name: asset.name,
      price: lastCandle.close,
      updatedAt: lastCandle.time,
    };
  });
}
