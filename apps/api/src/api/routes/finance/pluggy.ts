import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { getPluggyClient, isPluggyConfigured } from '../../../lib/pluggy.js';
import { createUserClient } from '../../../lib/supabase.js';
import {
  syncPluggyItem,
  deletePluggyItemRemote,
  PluggyOwnershipError,
} from '../../../services/pluggy-sync-service.js';
import {
  listConnections,
  getConnectionOwnedByUser,
  deletePluggyItem,
} from '../../../data/finance/pluggy-repository.js';
import type {
  PluggyConnectionView,
  PluggySyncResult,
} from '../../../domain/pluggy-types.js';
import { createRateLimiter } from '../../middleware/simple-rate-limit.js';

// Backfill fala com a Pluggy e o banco: limite proprio por usuario.
const checkSyncLimit = createRateLimiter(10, 60 * 1000);

interface ConnectTokenBody {
  /** Passado apenas no fluxo de reconexao (atualizar um Item existente). */
  item_id?: string;
}
interface RegisterItemBody {
  item_id?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serviceUnavailable(reply: import('fastify').FastifyReply, message: string) {
  return reply.status(503).send({
    error: 'Service Unavailable',
    message,
    statusCode: 503,
  });
}

export async function pluggyRoutes(app: FastifyInstance) {
  // POST /finance/pluggy/connect-token — emite o token curto do widget.
  // clientUserId e SEMPRE derivado de request.user.id (nunca do body): amarra o
  // Item ao mesmo id usado no RLS e habilita avoidDuplicates por usuario.
  app.post<{ Body: ConnectTokenBody; Reply: { accessToken: string } | ApiError }>(
    '/finance/pluggy/connect-token',
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;

      if (!isPluggyConfigured()) {
        return serviceUnavailable(
          reply,
          'Integracao bancaria indisponivel: configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.'
        );
      }

      const itemId = request.body?.item_id;
      if (itemId && !UUID_RE.test(itemId)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'item_id invalido',
          statusCode: 400,
        });
      }

      try {
        // webhookUrl NÃO vai aqui: usamos um webhook GLOBAL (registrado uma vez
        // via scripts/pluggy-register-webhook) para não duplicar entregas.
        const { accessToken } = await getPluggyClient().createConnectToken(itemId, {
          clientUserId: user.id,
          avoidDuplicates: true,
        });
        return reply.send({ accessToken });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao iniciar conexao';
        return serviceUnavailable(reply, message);
      }
    }
  );

  // POST /finance/pluggy/items — registra o Item conectado e faz o backfill
  // sincrono (contas + transacoes aparecem na hora). Fonte da verdade real sao
  // os webhooks (Fase 1); aqui e so um acelerador do primeiro load.
  app.post<{ Body: RegisterItemBody; Reply: PluggySyncResult | ApiError }>(
    '/finance/pluggy/items',
    async (request, reply) => {
      const { user, accessToken } = request as AuthenticatedRequest;
      const itemId = request.body?.item_id;

      if (!itemId || !UUID_RE.test(itemId)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'item_id e obrigatorio',
          statusCode: 400,
        });
      }
      if (!isPluggyConfigured()) {
        return serviceUnavailable(reply, 'Integracao bancaria indisponivel.');
      }
      if (!checkSyncLimit(user.id)) {
        return reply.status(429).send({
          error: 'Too Many Requests',
          message: 'Muitas sincronizacoes em sequencia. Aguarde um minuto.',
          statusCode: 429,
        });
      }

      try {
        const result = await syncPluggyItem(
          createUserClient(accessToken),
          user.id,
          itemId
        );
        return reply.status(201).send(result);
      } catch (err) {
        if (err instanceof PluggyOwnershipError) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Esta conexao nao pertence a voce',
            statusCode: 403,
          });
        }
        const message =
          err instanceof Error ? err.message : 'Erro ao importar dados do banco';
        return reply.status(500).send({
          error: 'Internal Server Error',
          message,
          statusCode: 500,
        });
      }
    }
  );

  // GET /finance/pluggy/items — bancos conectados do usuario.
  app.get<{ Reply: PluggyConnectionView[] | ApiError }>(
    '/finance/pluggy/items',
    async (request, reply) => {
      const { user, accessToken } = request as AuthenticatedRequest;
      try {
        const connections = await listConnections(user.id, accessToken);
        return reply.send(connections);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao listar conexoes';
        return reply.status(500).send({
          error: 'Internal Server Error',
          message,
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /finance/pluggy/items/:id — desconecta o banco. Revoga o consentimento
  // na Pluggy (DELETE /items) e remove o vinculo local; as linhas finance_* ja
  // importadas sao PRESERVADAS (opcao "manter historico").
  app.delete<{ Params: { id: string }; Reply: { disconnected: true } | ApiError }>(
    '/finance/pluggy/items/:id',
    async (request, reply) => {
      const { user, accessToken } = request as AuthenticatedRequest;
      const rowId = request.params.id;

      if (!UUID_RE.test(rowId)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'id invalido',
          statusCode: 400,
        });
      }

      try {
        // Nunca confia no id do path: valida posse pelo RLS do usuario.
        const connection = await getConnectionOwnedByUser(rowId, user.id, accessToken);
        if (!connection) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conexao nao encontrada',
            statusCode: 404,
          });
        }

        if (isPluggyConfigured()) {
          try {
            await deletePluggyItemRemote(connection.pluggy_item_id);
          } catch (err) {
            // A Pluggy pode recusar a revogação (item de outro ambiente/app,
            // credencial trocada, instabilidade). Loga o motivo real e devolve
            // uma mensagem acionável em vez de estourar um 500 opaco.
            request.log.error(
              { err, pluggy_item_id: connection.pluggy_item_id },
              'Falha ao revogar item na Pluggy'
            );
            // A SDK rejeita com o corpo do erro da Pluggy ({ code, message }),
            // que nao e uma instancia de Error.
            const detail =
              err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null && 'message' in err
                  ? String((err as { message: unknown }).message)
                  : String(err);
            return reply.status(502).send({
              error: 'Bad Gateway',
              message: `Falha ao revogar o consentimento na Pluggy: ${detail}`,
              statusCode: 502,
            });
          }
        }
        await deletePluggyItem(connection.pluggy_item_id);

        return reply.send({ disconnected: true });
      } catch (err) {
        request.log.error({ err }, 'Erro ao desconectar banco');
        const message = err instanceof Error ? err.message : 'Erro ao desconectar banco';
        return reply.status(500).send({
          error: 'Internal Server Error',
          message,
          statusCode: 500,
        });
      }
    }
  );
}
