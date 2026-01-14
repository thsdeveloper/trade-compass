import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { assetsRoutes } from './routes/assets.js';
import { analysisRoutes } from './routes/analysis.js';
import { candlesRoutes } from './routes/candles.js';
import { mysticPulseRoutes } from './routes/mystic-pulse.js';
import { watchlistRoutes } from './routes/watchlist.js';
import { signalsRoutes } from './routes/signals.js';
import { backtestRoutes } from './routes/backtest.js';

const isTest = process.env.NODE_ENV === 'test';

export async function buildServer() {
  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        },
  });

  // CORS
  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(assetsRoutes);
  await app.register(analysisRoutes);
  await app.register(candlesRoutes);
  await app.register(mysticPulseRoutes);
  await app.register(watchlistRoutes);
  await app.register(signalsRoutes);
  await app.register(backtestRoutes);

  // Error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode ?? 500;
    const message = error.message ?? 'Erro interno do servidor';

    reply.status(statusCode).send({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message,
      statusCode,
    });
  });

  return app;
}
