import type { FastifyInstance } from 'fastify';
import { insertWebhookEvent } from '../../data/finance/pluggy-repository.js';
import { drainPendingWebhookEvents } from '../../services/pluggy-webhook-processor.js';

// Payload dos webhooks da Pluggy. item/* trazem clientUserId; transactions/*
// trazem só itemId/accountId/transactionIds. Campos extras são preservados no
// jsonb (payload) para o processador.
interface WebhookBody {
  event?: string;
  eventId?: string;
  id?: string;
  itemId?: string;
  accountId?: string;
  clientUserId?: string;
  transactionIds?: string[];
  [key: string]: unknown;
}

/**
 * Rota PÚBLICA (fora do financeRoutes/auth): a Pluggy chama sem JWT do usuário.
 * Autenticidade (Pluggy NÃO assina com HMAC): (a) header secreto estático que
 * configuramos no registro do webhook, (b) IP de origem opcional, (c) o
 * processador re-busca GET /items como âncora de confiança. Persiste o evento e
 * responde 200 em <5s; o processamento é assíncrono e durável.
 */
export async function pluggyWebhookRoutes(app: FastifyInstance) {
  app.post<{ Body: WebhookBody }>('/webhooks/pluggy', async (request, reply) => {
    const secret = process.env.PLUGGY_WEBHOOK_SECRET;
    if (secret) {
      if (request.headers['x-webhook-secret'] !== secret) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }

    const allowedIp = process.env.PLUGGY_ALLOWED_IP;
    if (allowedIp) {
      const ip =
        (request.headers['fly-client-ip'] as string) ||
        (request.headers['x-forwarded-for'] as string) ||
        '';
      if (ip && !ip.includes(allowedIp)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }

    const body = request.body || {};
    const eventId = body.eventId || body.id;
    const event = body.event;

    // Pings de teste / payloads sem eventId: só confirma recebimento.
    if (!eventId || !event) {
      return reply.status(200).send({ received: true });
    }

    try {
      // Persiste ANTES do 200 (dedup por event_id). Idempotente para os até 9
      // reenvios da Pluggy.
      await insertWebhookEvent({
        event_id: eventId,
        event,
        item_id: body.itemId ?? null,
        account_id: body.accountId ?? null,
        client_user_id: body.clientUserId ?? null,
        payload: body,
      });
    } catch {
      // Não conseguimos persistir → 500 para a Pluggy reenviar (não perder).
      return reply.status(500).send({ error: 'persist_failed' });
    }

    // Responde já e processa async (o evento está durável).
    void reply.status(200).send({ received: true });
    void drainPendingWebhookEvents();
  });
}
