import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { FinanceCategory } from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getCategoriesByUser,
  getCategoryById,
  getOrCreateAdjustmentCategory,
} from '../../../data/finance/category-repository.js';
import type { FinanceCategoryType } from '../../../domain/finance-types.js';

// Categorias são somente leitura (catálogo global do sistema). Não há mais
// criação/edição/exclusão de categorias por usuário.
export async function categoryRoutes(app: FastifyInstance) {
  // GET /finance/categories - Lista o catálogo global de categorias
  app.get<{
    Reply: FinanceCategory[] | ApiError;
  }>('/finance/categories', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const categories = await getCategoriesByUser(user.id, accessToken);
      return categories;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar categorias';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/categories/:id - Categoria por ID
  app.get<{
    Params: { id: string };
    Reply: FinanceCategory | ApiError;
  }>('/finance/categories/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const category = await getCategoryById(id, user.id, accessToken);

      if (!category) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Categoria nao encontrada',
          statusCode: 404,
        });
      }

      return category;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar categoria';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/categories/system/adjustment/:type - Categoria de ajuste de saldo
  app.get<{
    Params: { type: FinanceCategoryType };
    Reply: FinanceCategory | ApiError;
  }>('/finance/categories/system/adjustment/:type', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { type } = request.params;

    if (type !== 'RECEITA' && type !== 'DESPESA') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tipo deve ser RECEITA ou DESPESA',
        statusCode: 400,
      });
    }

    try {
      const category = await getOrCreateAdjustmentCategory(user.id, type, accessToken);
      return category;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao obter categoria de ajuste';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
