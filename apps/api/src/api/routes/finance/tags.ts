import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceTag,
  CreateTagDTO,
  UpdateTagDTO,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getTagsByUser,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
} from '../../../data/finance/tag-repository.js';

export async function tagRoutes(app: FastifyInstance) {
  // GET /finance/tags - List user tags
  app.get<{
    Reply: FinanceTag[] | ApiError;
  }>('/finance/tags', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const tags = await getTagsByUser(user.id, accessToken);
      return tags;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar tags';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/tags/:id - Get tag by ID
  app.get<{
    Params: { id: string };
    Reply: FinanceTag | ApiError;
  }>('/finance/tags/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const tag = await getTagById(id, user.id, accessToken);

      if (!tag) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Tag nao encontrada',
          statusCode: 404,
        });
      }

      return tag;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar tag';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/tags - Create tag
  app.post<{
    Body: CreateTagDTO;
    Reply: FinanceTag | ApiError;
  }>('/finance/tags', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.name?.trim()) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome da tag e obrigatorio',
        statusCode: 400,
      });
    }

    try {
      const tag = await createTag(user.id, body, accessToken);
      return reply.status(201).send(tag);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tag';
      const status = message.includes('ja existe') ? 400 : 500;
      return reply.status(status).send({
        error: status === 400 ? 'Bad Request' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /finance/tags/:id - Update tag (rename)
  app.patch<{
    Params: { id: string };
    Body: UpdateTagDTO;
    Reply: FinanceTag | ApiError;
  }>('/finance/tags/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (body.name !== undefined && !body.name.trim()) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome da tag e obrigatorio',
        statusCode: 400,
      });
    }

    try {
      const tag = await updateTag(
        id,
        user.id,
        body.name !== undefined ? { ...body, name: body.name.trim() } : body,
        accessToken
      );
      return tag;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar tag';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/tags/:id - Delete tag (soft delete)
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/tags/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteTag(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover tag';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
