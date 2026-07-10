import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { verifyUserPassword } from '../../../lib/supabase.js';
import {
  resetAllTransactions,
  type ResetTransactionsResult,
} from '../../../data/finance/reset-repository.js';

interface ResetBody {
  password: string;
  zero_initial_balances?: boolean;
}

// Rate limit de tentativas de senha: 5 por minuto por usuario
// (protege contra forca bruta usando este endpoint como oraculo de senha)
const attemptLog = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (attemptLog.get(userId) || []).filter(
    (ts) => now - ts < WINDOW_MS
  );
  attemptLog.set(userId, attempts);
  return attempts.length >= MAX_ATTEMPTS;
}

function registerAttempt(userId: string): void {
  const attempts = attemptLog.get(userId) || [];
  attempts.push(Date.now());
  attemptLog.set(userId, attempts);
}

export async function resetRoutes(app: FastifyInstance) {
  // POST /finance/reset - Apaga todos os lancamentos do usuario (acao destrutiva)
  // Requer a senha do usuario para confirmar.
  app.post<{
    Body: ResetBody;
    Reply: ResetTransactionsResult | ApiError;
  }>('/finance/reset', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const password = request.body?.password;

    if (!password || typeof password !== 'string') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Senha e obrigatoria para confirmar a operacao',
        statusCode: 400,
      });
    }

    if (isRateLimited(user.id)) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        statusCode: 429,
      });
    }

    registerAttempt(user.id);

    const passwordValid = await verifyUserPassword(user.email, password);
    if (!passwordValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Senha incorreta',
        statusCode: 401,
      });
    }

    try {
      const result = await resetAllTransactions(user.id, accessToken, {
        zeroInitialBalances: request.body?.zero_initial_balances === true,
      });
      request.log.warn(
        { userId: user.id, ...result },
        'Reset de transacoes executado'
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao zerar transacoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
