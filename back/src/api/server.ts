import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { assetsRoutes } from './routes/assets.js';
import { analysisRoutes } from './routes/analysis.js';
import { candlesRoutes } from './routes/candles.js';
import { mysticPulseRoutes } from './routes/mystic-pulse.js';
import { watchlistRoutes } from './routes/watchlist.js';
import { signalsRoutes } from './routes/signals.js';
import { backtestRoutes } from './routes/backtest.js';
import { financeRoutes } from './routes/finance/index.js';
import { appRouter, createContext, type AppRouter } from '../trpc/index.js';

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

export async function buildServer() {
  const app = Fastify({
    logger: isTest
      ? false
      : isProd
        ? { level: 'info' }
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
    origin: true, // Permite todas as origens em desenvolvimento (mobile, localhost, etc)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // tRPC
  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  // Routes (legacy REST - will be deprecated)
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(assetsRoutes);
  await app.register(analysisRoutes);
  await app.register(candlesRoutes);
  await app.register(mysticPulseRoutes);
  await app.register(watchlistRoutes);
  await app.register(signalsRoutes);
  await app.register(backtestRoutes);
  await app.register(financeRoutes);

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
