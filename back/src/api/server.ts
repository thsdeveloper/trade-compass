import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { assetsRoutes } from './routes/assets.js';
import { analysisRoutes } from './routes/analysis.js';
import { candlesRoutes } from './routes/candles.js';

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
    methods: ['GET'],
  });

  // Routes
  await app.register(healthRoutes);
  await app.register(assetsRoutes);
  await app.register(analysisRoutes);
  await app.register(candlesRoutes);

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
