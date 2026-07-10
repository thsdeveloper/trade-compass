import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceRecurrence,
  FinanceTransaction,
  CreateRecurrenceDTO,
  UpdateRecurrenceDTO,
  RecurrenceWithDetails,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getRecurrencesByUser,
  getRecurrenceById,
  createRecurrence,
  updateRecurrence,
  deleteRecurrence,
  generateNextOccurrences,
  getPendingRecurrences,
} from '../../../data/finance/recurrence-repository.js';

export async function recurrenceRoutes(app: FastifyInstance) {
  // GET /finance/recurrences - List user recurrences
  app.get<{
    Reply: RecurrenceWithDetails[] | ApiError;
  }>('/finance/recurrences', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const recurrences = await getRecurrencesByUser(user.id, accessToken);
      return recurrences;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar recorrencias';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/recurrences/pending - List recurrences that need to generate transactions
  app.get<{
    Reply: FinanceRecurrence[] | ApiError;
  }>('/finance/recurrences/pending', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const recurrences = await getPendingRecurrences(user.id, accessToken);
      return recurrences;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar recorrencias pendentes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/recurrences/:id - Get recurrence by ID
  app.get<{
    Params: { id: string };
    Reply: FinanceRecurrence | ApiError;
  }>('/finance/recurrences/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const recurrence = await getRecurrenceById(id, user.id, accessToken);

      if (!recurrence) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Recorrencia nao encontrada',
          statusCode: 404,
        });
      }

      return recurrence;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar recorrencia';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/recurrences - Create recurrence
  app.post<{
    Body: CreateRecurrenceDTO;
    Reply: FinanceRecurrence | ApiError;
  }>('/finance/recurrences', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (
      !body.category_id ||
      !body.description ||
      !body.amount ||
      !body.type ||
      !body.frequency ||
      !body.start_date
    ) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Categoria, descricao, valor, tipo, frequencia e data de inicio sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.account_id && body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe conta OU cartao, nao ambos',
        statusCode: 400,
      });
    }

    try {
      const recurrence = await createRecurrence(user.id, body, accessToken);
      return reply.status(201).send(recurrence);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar recorrencia';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/recurrences/:id/generate - Generate next occurrences
  app.post<{
    Params: { id: string };
    Querystring: { count?: number };
    Reply: FinanceTransaction[] | ApiError;
  }>('/finance/recurrences/:id/generate', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const { count = 1 } = request.query;

    if (count < 1 || count > 2000) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Quantidade deve estar entre 1 e 2000',
        statusCode: 400,
      });
    }

    try {
      const transactions = await generateNextOccurrences(id, user.id, count, accessToken);
      return transactions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar transacoes';
      const status = message.includes('nao encontrada') || message.includes('inativa') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /finance/recurrences/:id - Update recurrence
  app.patch<{
    Params: { id: string };
    Body: UpdateRecurrenceDTO;
    Reply: FinanceRecurrence | ApiError;
  }>('/finance/recurrences/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      const recurrence = await updateRecurrence(id, user.id, updates, accessToken);
      return recurrence;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar recorrencia';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/recurrences/:id - Delete recurrence (soft delete)
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/recurrences/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteRecurrence(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover recorrencia';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
