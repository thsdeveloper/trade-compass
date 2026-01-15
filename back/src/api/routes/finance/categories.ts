import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getCategoriesByUser,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../data/finance/category-repository.js';

export async function categoryRoutes(app: FastifyInstance) {
  // GET /finance/categories - List user categories
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

  // GET /finance/categories/:id - Get category by ID
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

  // POST /finance/categories - Create category
  app.post<{
    Body: CreateCategoryDTO;
    Reply: FinanceCategory | ApiError;
  }>('/finance/categories', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.name || !body.type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome e tipo sao obrigatorios',
        statusCode: 400,
      });
    }

    try {
      const category = await createCategory(user.id, body, accessToken);
      return reply.status(201).send(category);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar categoria';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/categories/:id - Update category
  app.patch<{
    Params: { id: string };
    Body: UpdateCategoryDTO;
    Reply: FinanceCategory | ApiError;
  }>('/finance/categories/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      const category = await updateCategory(id, user.id, updates, accessToken);
      return category;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/categories/:id - Delete category (soft delete)
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/categories/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteCategory(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover categoria';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
