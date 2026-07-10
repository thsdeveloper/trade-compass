import type { FastifyInstance } from 'fastify';
import type { AnalysisResponse, ApiError, SetupResult, SetupType } from '../../domain/types.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { calculateContext } from '../../engine/context.js';
import { calculateDecisionZone } from '../../engine/decision-zone.js';
import { detectSetup123 } from '../../engine/setups/setup-123.js';
import { runBacktestAsync } from '../../engine/backtest.js';

// Minimo de 85 candles (suficiente para EMA80 + margem)
const MIN_CANDLES_REQUIRED = 85;

export async function analysisRoutes(app: FastifyInstance) {
  // GET /assets/:ticker/analysis - Analise completa
  app.get<{
    Params: { ticker: string };
    Querystring: { timeframe?: string };
    Reply: AnalysisResponse | ApiError;
  }>('/assets/:ticker/analysis', async (request, reply) => {
    const { ticker } = request.params;
    const { timeframe } = request.query; // Pega timeframe da querystring, ex: ?timeframe=120m
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

    // Default para 1d (diario) - temos historico longo disponivel
    const targetTimeframe = timeframe || '1d';

    // Obter candles (async - busca via BRAPI)
    const candles = await getCandlesAsync(normalizedTicker, 300, targetTimeframe);

    if (!candles || candles.length < MIN_CANDLES_REQUIRED) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: `Dados insuficientes para analise em ${targetTimeframe}. Minimo: ${MIN_CANDLES_REQUIRED} candles, encontrados: ${candles?.length ?? 0}`,
        statusCode: 422,
      });
    }

    // Calcular contexto
    const context = calculateContext(candles);

    // Detectar setups
    const setups: SetupResult[] = [];

    // Setup 123 (Compra/Venda)
    const setup123 = detectSetup123(normalizedTicker, candles);
    if (setup123) {
      // Buscar taxa de sucesso real do banco de dados
      try {
        const backtest = await runBacktestAsync(normalizedTicker, setup123.id as SetupType);
        setup123.successRate = Math.round(backtest.successRate);
      } catch (error) {
        // Se falhar, manter successRate original (0)
        app.log.warn(`Erro ao buscar backtest para ${normalizedTicker}/${setup123.id}: ${error}`);
      }
      setups.push(setup123);
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
