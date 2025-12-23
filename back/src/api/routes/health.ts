import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '../../domain/types.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get<{
    Reply: HealthResponse;
  }>('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });
}
