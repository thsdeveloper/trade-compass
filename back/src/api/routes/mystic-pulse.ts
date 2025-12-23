import type { FastifyInstance } from 'fastify';
import type { ApiError, MysticPulseSeriesResponse, MysticPulseDataPoint } from '../../domain/types.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { mysticPulseSeries } from '../../engine/indicators/mystic-pulse.js';
import {
  MYSTIC_PULSE_ADX_LENGTH,
  MYSTIC_PULSE_COLLECT_LENGTH,
  MYSTIC_PULSE_GAMMA,
} from '../../domain/constants.js';

const MIN_CANDLES_REQUIRED = 20;

export async function mysticPulseRoutes(app: FastifyInstance) {
  // GET /assets/:ticker/mystic-pulse/series - Serie historica do Mystic Pulse
  app.get<{
    Params: { ticker: string };
    Reply: MysticPulseSeriesResponse | ApiError;
  }>('/assets/:ticker/mystic-pulse/series', async (request, reply) => {
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

    // Obter candles
    const candles = await getCandlesAsync(normalizedTicker);
    if (!candles || candles.length < MIN_CANDLES_REQUIRED) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes. Minimo: ${MIN_CANDLES_REQUIRED} candles, encontrados: ${candles?.length ?? 0}`,
        statusCode: 422,
      });
    }

    // Calcular serie do Mystic Pulse
    const series = mysticPulseSeries(
      candles,
      MYSTIC_PULSE_ADX_LENGTH,
      MYSTIC_PULSE_COLLECT_LENGTH,
      MYSTIC_PULSE_GAMMA
    );

    // Montar resposta com dados para plotagem
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
        // Candles sem dados suficientes - valores zerados
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
  });
}
