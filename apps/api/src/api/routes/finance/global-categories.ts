import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { GlobalCategoryWithChildren } from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getGlobalCategories,
  buildGlobalCategoryTree,
} from '../../../data/finance/global-category-repository.js';

export async function globalCategoryRoutes(app: FastifyInstance) {
  // GET /finance/global-categories - Catálogo global em árvore (mãe -> filhas)
  app.get<{
    Reply: GlobalCategoryWithChildren[] | ApiError;
  }>('/finance/global-categories', async (request, reply) => {
    const { accessToken } = request as AuthenticatedRequest;

    try {
      const categories = await getGlobalCategories(accessToken);
      return buildGlobalCategoryTree(categories);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao buscar categorias globais';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
