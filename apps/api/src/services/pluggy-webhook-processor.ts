import { supabaseAdmin } from '../lib/supabase.js';
import {
  resetStaleProcessing,
  claimPendingWebhookEvents,
  markWebhookEvent,
  getPluggyItemByPluggyId,
  deletePluggyItem,
  deleteSyncedTransactionsByFitids,
} from '../data/finance/pluggy-repository.js';
import { syncPluggyItem, refreshPluggyItemStatus } from './pluggy-sync-service.js';
import type { PluggyWebhookEventRow } from '../domain/pluggy-types.js';

const STALE_MINUTES = 5; // eventos presos em PROCESSING além disso voltam a PENDING
const BATCH = 20;

// Trava por-processo: evita drenos concorrentes na mesma máquina. Em várias
// máquinas, o claim atômico (UPDATE ... WHERE status='PENDING') evita duplicar.
let draining = false;

/**
 * Dreno durável: processa todos os eventos PENDING. Chamado (a) a cada webhook
 * recebido (self-healing) e (b) por um cron da Fly. Como o evento é persistido
 * antes do 200, um suspend no meio não perde nada — o próximo dreno retoma.
 */
export async function drainPendingWebhookEvents(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    await resetStaleProcessing(STALE_MINUTES);
    for (;;) {
      const batch = await claimPendingWebhookEvents(BATCH);
      if (batch.length === 0) break;
      for (const ev of batch) {
        try {
          await processWebhookEvent(ev);
          await markWebhookEvent(ev.event_id, 'DONE');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await markWebhookEvent(ev.event_id, 'ERROR', msg.slice(0, 500));
        }
      }
    }
  } finally {
    draining = false;
  }
}

function extractTransactionIds(payload: Record<string, unknown> | null): string[] {
  const ids = payload?.['transactionIds'];
  if (Array.isArray(ids)) {
    return ids.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

async function processWebhookEvent(ev: PluggyWebhookEventRow): Promise<void> {
  const pluggyItemId = ev.item_id;
  // Eventos sem item (ex: connector/status_updated) não têm o que sincronizar.
  if (!pluggyItemId) return;

  const owner = await getPluggyItemByPluggyId(pluggyItemId);

  switch (ev.event) {
    case 'item/created':
    case 'item/updated':
    case 'transactions/created':
    case 'transactions/updated': {
      // Precisamos do dono. Se o Item ainda não está mapeado (webhook chegou
      // antes do POST /items), usamos o clientUserId do payload (presente em
      // item/*). Sem dono, lançamos erro → retry da Pluggy/próximo dreno.
      const userId = owner?.user_id ?? ev.client_user_id ?? null;
      if (!userId) {
        throw new Error(`Owner ainda não mapeado para o item ${pluggyItemId}`);
      }
      // re-fetch (GET /items) + upsert acontece dentro de syncPluggyItem: o
      // payload nunca é a fonte da verdade (Pluggy não assina o webhook).
      await syncPluggyItem(supabaseAdmin, userId, pluggyItemId);
      break;
    }
    case 'transactions/deleted': {
      if (!owner) return;
      const ids = extractTransactionIds(ev.payload);
      if (ids.length > 0) {
        await deleteSyncedTransactionsByFitids(supabaseAdmin, owner.user_id, ids);
      }
      break;
    }
    case 'item/deleted': {
      // Conexão removida na Pluggy → limpa o vínculo local (mantém histórico).
      await deletePluggyItem(pluggyItemId);
      break;
    }
    case 'item/error':
    case 'item/waiting_user_input':
    case 'item/waiting_user_action':
    case 'item/login_succeeded': {
      if (owner) await refreshPluggyItemStatus(pluggyItemId);
      break;
    }
    default:
      // Evento não tratado: no-op (marcado DONE pelo dreno).
      break;
  }
}
