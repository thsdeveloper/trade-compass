import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceAccount,
  CreateAccountDTO,
  UpdateAccountDTO,
  AccountUsage,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getAccountsByUser,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountUsage,
} from '../../../data/finance/account-repository.js';
import { createAccountSchema, updateAccountSchema } from '../../../domain/finance-schemas.js';

// Erro de validacao com o mapa campo -> mensagem, para o app destacar o campo errado.
interface ValidationApiError extends ApiError {
  fields: Record<string, string>;
}

// Monta o corpo do 400 a partir das issues do zod, com o mapa campo -> mensagem.
function validationError(issues: { path: PropertyKey[]; message: string }[]): ValidationApiError {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.join('.') || 'body';
    if (!fields[field]) {
      fields[field] = issue.message;
    }
  }

  return {
    error: 'Bad Request',
    message: issues[0]?.message ?? 'Dados invalidos',
    statusCode: 400,
    fields,
  };
}

// Traduz o codigo de erro do Postgres/PostgREST em resposta HTTP, sem vazar
// a mensagem crua do banco para o usuario.
function mapAccountError(
  err: unknown,
  fallback: string
): { status: number; error: string; message: string } {
  const code = (err as { code?: string } | null)?.code;

  switch (code) {
    case '23505':
      return {
        status: 409,
        error: 'Conflict',
        message: 'Voce ja tem uma conta com esse nome',
      };
    case '23503':
      return { status: 400, error: 'Bad Request', message: 'O banco informado nao existe' };
    case '22P02':
      return { status: 400, error: 'Bad Request', message: 'Dados invalidos' };
    case '42501':
    case 'PGRST301':
      return {
        status: 403,
        error: 'Forbidden',
        message: 'Sem permissao para esta operacao',
      };
    default:
      return { status: 500, error: 'Internal Server Error', message: fallback };
  }
}

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
      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Nao foi possivel carregar as contas',
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
      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Nao foi possivel carregar a conta',
        statusCode: 500,
      });
    }
  });

  // GET /finance/accounts/:id/usage - Registros vinculados a conta
  // Registrada antes de /:id por clareza; o segmento estatico /usage tem
  // precedencia sobre o parametrico no roteador do Fastify.
  app.get<{
    Params: { id: string };
    Reply: AccountUsage | ApiError;
  }>('/finance/accounts/:id/usage', async (request, reply) => {
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

      return await getAccountUsage(id, user.id, accessToken);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Nao foi possivel carregar os vinculos da conta',
        statusCode: 500,
      });
    }
  });

  // POST /finance/accounts - Create account
  app.post<{
    Body: CreateAccountDTO;
    Reply: FinanceAccount | ApiError | ValidationApiError;
  }>('/finance/accounts', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    const parsed = createAccountSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.issues));
    }

    try {
      // user.id vem do token validado pelo authMiddleware, nunca do body
      const account = await createAccount(user.id, parsed.data, accessToken);
      return reply.status(201).send(account);
    } catch (err) {
      const mapped = mapAccountError(err, 'Nao foi possivel criar a conta');
      if (mapped.status === 500) {
        request.log.error(err);
      }
      return reply.status(mapped.status).send({
        error: mapped.error,
        message: mapped.message,
        statusCode: mapped.status,
      });
    }
  });

  // PATCH /finance/accounts/:id - Update account
  app.patch<{
    Params: { id: string };
    Body: UpdateAccountDTO;
    Reply: FinanceAccount | ApiError | ValidationApiError;
  }>('/finance/accounts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    // O zod opera em modo strip: colunas que nao estao no schema (id, user_id,
    // current_balance, created_at) sao descartadas antes de chegar ao UPDATE.
    const parsed = updateAccountSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.issues));
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe ao menos um campo para atualizar',
        statusCode: 400,
      });
    }

    try {
      const account = await updateAccount(id, user.id, updates, accessToken);
      return account;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar conta';

      if (message.includes('nao encontrada')) {
        return reply.status(404).send({
          error: 'Not Found',
          message,
          statusCode: 404,
        });
      }

      const mapped = mapAccountError(err, 'Nao foi possivel atualizar a conta');
      if (mapped.status === 500) {
        request.log.error(err);
      }
      return reply.status(mapped.status).send({
        error: mapped.error,
        message: mapped.message,
        statusCode: mapped.status,
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
      const message = err instanceof Error ? err.message : '';

      // Mensagem propria e segura: explica ao usuario o que impede a remocao.
      if (message.includes('registros vinculados')) {
        return reply.status(409).send({
          error: 'Conflict',
          message,
          statusCode: 409,
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Nao foi possivel remover a conta',
        statusCode: 500,
      });
    }
  });
}
