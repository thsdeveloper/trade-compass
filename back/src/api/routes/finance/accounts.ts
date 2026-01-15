import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceAccount,
  CreateAccountDTO,
  UpdateAccountDTO,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getAccountsByUser,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../../../data/finance/account-repository.js';

export async function accountRoutes(app: FastifyInstance) {
  // GET /finance/accounts - List user accounts
  app.get<{
    Reply: FinanceAccount[] | ApiError;
  }>('/finance/accounts', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const accounts = await getAccountsByUser(user.id, accessToken);
      return accounts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar contas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/accounts/:id - Get account by ID
  app.get<{
    Params: { id: string };
    Reply: FinanceAccount | ApiError;
  }>('/finance/accounts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const account = await getAccountById(id, user.id, accessToken);

      if (!account) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Conta nao encontrada',
          statusCode: 404,
        });
      }

      return account;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar conta';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/accounts - Create account
  app.post<{
    Body: CreateAccountDTO;
    Reply: FinanceAccount | ApiError;
  }>('/finance/accounts', async (request, reply) => {
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
      const account = await createAccount(user.id, body, accessToken);
      return reply.status(201).send(account);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/accounts/:id - Update account
  app.patch<{
    Params: { id: string };
    Body: UpdateAccountDTO;
    Reply: FinanceAccount | ApiError;
  }>('/finance/accounts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      const account = await updateAccount(id, user.id, updates, accessToken);
      return account;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar conta';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/accounts/:id - Delete account (soft delete)
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/accounts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteAccount(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover conta';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
