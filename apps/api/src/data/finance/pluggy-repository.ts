import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserClient, supabaseAdmin } from '../../lib/supabase.js';
import type {
  FinanceAccountType,
  CreditCardBrand,
  FinanceCategoryType,
  TransactionType,
  TransactionStatus,
} from '../../domain/finance-types.js';
import type {
  PluggyItemRow,
  PluggyAccountRow,
  PluggyConnectionView,
  PluggyWebhookEventRow,
  UpsertPluggyItemInput,
  UpsertPluggyAccountInput,
} from '../../domain/pluggy-types.js';

const ITEMS = 'pluggy_items';
const ACCOUNTS = 'pluggy_accounts';
const EVENTS = 'pluggy_webhook_events';

// ============================================================================
// pluggy_items / pluggy_accounts — escrita via service_role (backfill/webhook),
// leitura via RLS do dono. O usuario NUNCA escreve direto nestas tabelas.
// ============================================================================

export async function upsertPluggyItem(
  input: UpsertPluggyItemInput
): Promise<PluggyItemRow> {
  const { data, error } = await supabaseAdmin
    .from(ITEMS)
    .upsert(
      {
        user_id: input.user_id,
        pluggy_item_id: input.pluggy_item_id,
        connector_id: input.connector_id,
        connector_name: input.connector_name,
        connector_image_url: input.connector_image_url,
        status: input.status,
        execution_status: input.execution_status,
        consent_expires_at: input.consent_expires_at,
        pluggy_created_at: input.pluggy_created_at,
        pluggy_updated_at: input.pluggy_updated_at,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pluggy_item_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Erro ao gravar conexao Pluggy: ${error.message}`);
  return data as PluggyItemRow;
}

export async function upsertPluggyAccount(
  input: UpsertPluggyAccountInput
): Promise<PluggyAccountRow> {
  const { data, error } = await supabaseAdmin
    .from(ACCOUNTS)
    .upsert(
      {
        user_id: input.user_id,
        pluggy_item_id: input.pluggy_item_id,
        pluggy_account_id: input.pluggy_account_id,
        pluggy_type: input.pluggy_type,
        pluggy_subtype: input.pluggy_subtype,
        finance_account_id: input.finance_account_id,
        finance_credit_card_id: input.finance_credit_card_id,
        last_balance: input.last_balance,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pluggy_account_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Erro ao gravar conta Pluggy: ${error.message}`);
  return data as PluggyAccountRow;
}

/** Vinculo existente de uma conta Pluggy (para re-sync idempotente). */
export async function getPluggyAccountMapping(
  pluggyAccountId: string
): Promise<PluggyAccountRow | null> {
  const { data, error } = await supabaseAdmin
    .from(ACCOUNTS)
    .select('*')
    .eq('pluggy_account_id', pluggyAccountId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar conta Pluggy: ${error.message}`);
  return (data as PluggyAccountRow) || null;
}

/** Resolve o dono de um Item (chave de todo webhook: item_id -> user_id). */
export async function getPluggyItemByPluggyId(
  pluggyItemId: string
): Promise<PluggyItemRow | null> {
  const { data, error } = await supabaseAdmin
    .from(ITEMS)
    .select('*')
    .eq('pluggy_item_id', pluggyItemId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar Item Pluggy: ${error.message}`);
  return (data as PluggyItemRow) || null;
}

export async function touchPluggyItemSynced(pluggyItemId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from(ITEMS)
    .update({ last_synced_at: now, updated_at: now })
    .eq('pluggy_item_id', pluggyItemId);
}

/** Atualiza status/execution/consent de um Item (usado nos webhooks item/*). */
export async function updatePluggyItemStatus(
  pluggyItemId: string,
  fields: {
    status?: string | null;
    execution_status?: string | null;
    consent_expires_at?: string | null;
  }
): Promise<void> {
  await supabaseAdmin
    .from(ITEMS)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('pluggy_item_id', pluggyItemId);
}

export async function listConnections(
  userId: string,
  accessToken: string
): Promise<PluggyConnectionView[]> {
  const client = createUserClient(accessToken);

  const { data: items, error } = await client
    .from(ITEMS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao listar conexoes: ${error.message}`);
  const rows = (items as PluggyItemRow[]) || [];
  if (rows.length === 0) return [];

  const { data: accounts } = await client
    .from(ACCOUNTS)
    .select('pluggy_item_id')
    .eq('user_id', userId);

  const counts = new Map<string, number>();
  for (const a of (accounts as { pluggy_item_id: string }[]) || []) {
    counts.set(a.pluggy_item_id, (counts.get(a.pluggy_item_id) || 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    pluggy_item_id: r.pluggy_item_id,
    connector_name: r.connector_name,
    connector_image_url: r.connector_image_url,
    status: r.status,
    last_synced_at: r.last_synced_at,
    consent_expires_at: r.consent_expires_at,
    accounts_count: counts.get(r.pluggy_item_id) || 0,
  }));
}

export async function getConnectionOwnedByUser(
  rowId: string,
  userId: string,
  accessToken: string
): Promise<PluggyItemRow | null> {
  const client = createUserClient(accessToken);
  const { data, error } = await client
    .from(ITEMS)
    .select('*')
    .eq('id', rowId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar conexao: ${error.message}`);
  return (data as PluggyItemRow) || null;
}

/** Remove o vinculo Pluggy (cascade em pluggy_accounts). As linhas finance_*
 *  ficam preservadas (opcao "manter historico"). */
export async function deletePluggyItem(pluggyItemId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(ITEMS)
    .delete()
    .eq('pluggy_item_id', pluggyItemId);

  if (error) throw new Error(`Erro ao remover conexao Pluggy: ${error.message}`);
}

// ============================================================================
// pluggy_webhook_events — durabilidade + idempotencia (só service_role).
// ============================================================================

export interface InsertWebhookEventInput {
  event_id: string;
  event: string;
  item_id: string | null;
  account_id: string | null;
  client_user_id: string | null;
  payload: unknown;
}

/** Insere o evento (dedup por event_id). Retorna true se era novo. */
export async function insertWebhookEvent(
  input: InsertWebhookEventInput
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(EVENTS)
    .upsert(
      {
        event_id: input.event_id,
        event: input.event,
        item_id: input.item_id,
        account_id: input.account_id,
        client_user_id: input.client_user_id,
        payload: input.payload,
        status: 'PENDING',
      },
      { onConflict: 'event_id', ignoreDuplicates: true }
    )
    .select('event_id');

  if (error) throw new Error(`Erro ao gravar webhook: ${error.message}`);
  // Com ignoreDuplicates, uma linha ja existente devolve array vazio.
  return Array.isArray(data) && data.length > 0;
}

/** Reseta eventos presos em PROCESSING (ex: máquina Fly suspendeu no meio). */
export async function resetStaleProcessing(olderThanMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  await supabaseAdmin
    .from(EVENTS)
    .update({ status: 'PENDING' })
    .eq('status', 'PROCESSING')
    .lt('received_at', cutoff);
}

/** Reivindica um lote PENDING (marca PROCESSING) para o dreno processar. */
export async function claimPendingWebhookEvents(
  limit: number
): Promise<PluggyWebhookEventRow[]> {
  const { data: pending, error } = await supabaseAdmin
    .from(EVENTS)
    .select('event_id')
    .eq('status', 'PENDING')
    .order('received_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro ao buscar webhooks pendentes: ${error.message}`);
  const ids = (pending as { event_id: string }[])?.map((r) => r.event_id) ?? [];
  if (ids.length === 0) return [];

  // Só reivindica os que AINDA estão PENDING (evita corrida entre drenos).
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from(EVENTS)
    .update({ status: 'PROCESSING', attempts: 1 })
    .in('event_id', ids)
    .eq('status', 'PENDING')
    .select('*');

  if (claimError) throw new Error(`Erro ao reivindicar webhooks: ${claimError.message}`);
  return (claimed as PluggyWebhookEventRow[]) || [];
}

export async function markWebhookEvent(
  eventId: string,
  status: 'DONE' | 'ERROR' | 'PENDING',
  error?: string
): Promise<void> {
  await supabaseAdmin
    .from(EVENTS)
    .update({
      status,
      error: error ?? null,
      processed_at: status === 'DONE' ? new Date().toISOString() : null,
    })
    .eq('event_id', eventId);
}

// ============================================================================
// Escrita das linhas finance_* sincronizadas — client INJETADO:
//   - rota autenticada (backfill) passa createUserClient(accessToken) -> RLS
//   - webhook (sem JWT) passa supabaseAdmin -> service_role
// user_id é sempre setado explicitamente, então as linhas ficam corretas em
// ambos os caminhos. NAO usa createPaidTransactionsBatch (ajuste incremental de
// saldo): o saldo vem direto do valor real da Pluggy.
// ============================================================================

export interface SyncedAccountInput {
  name: string;
  type: FinanceAccountType;
  bank_id: string | null;
  balance: number;
  color: string;
  icon: string;
}

export async function createSyncedAccount(
  client: SupabaseClient,
  userId: string,
  data: SyncedAccountInput
): Promise<string> {
  const { data: created, error } = await client
    .from('finance_accounts')
    .insert({
      user_id: userId,
      name: data.name,
      type: data.type,
      bank_id: data.bank_id,
      initial_balance: data.balance,
      current_balance: data.balance,
      color: data.color,
      icon: data.icon,
      source: 'PLUGGY',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Erro ao criar conta sincronizada: ${error.message}`);
  return (created as { id: string }).id;
}

export interface SyncedCreditCardInput {
  name: string;
  brand: CreditCardBrand;
  total_limit: number;
  available_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
}

export async function createSyncedCreditCard(
  client: SupabaseClient,
  userId: string,
  data: SyncedCreditCardInput
): Promise<string> {
  const { data: created, error } = await client
    .from('finance_credit_cards')
    .insert({
      user_id: userId,
      name: data.name,
      brand: data.brand,
      total_limit: data.total_limit,
      available_limit: data.available_limit,
      closing_day: data.closing_day,
      due_day: data.due_day,
      color: data.color,
      source: 'PLUGGY',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Erro ao criar cartao sincronizado: ${error.message}`);
  return (created as { id: string }).id;
}

export async function setAccountBalance(
  client: SupabaseClient,
  accountId: string,
  userId: string,
  balance: number
): Promise<void> {
  const { error } = await client
    .from('finance_accounts')
    .update({ current_balance: balance })
    .eq('id', accountId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erro ao atualizar saldo: ${error.message}`);
}

export async function setCardAvailableLimit(
  client: SupabaseClient,
  cardId: string,
  userId: string,
  availableLimit: number
): Promise<void> {
  const { error } = await client
    .from('finance_credit_cards')
    .update({ available_limit: availableLimit })
    .eq('id', cardId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erro ao atualizar limite: ${error.message}`);
}

export interface SyncedTransactionInput {
  category_id: string;
  account_id: string | null;
  credit_card_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  notes: string | null;
  import_fitid: string;
}

export async function insertSyncedTransactions(
  client: SupabaseClient,
  userId: string,
  rows: SyncedTransactionInput[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    user_id: userId,
    category_id: r.category_id,
    account_id: r.account_id,
    credit_card_id: r.credit_card_id,
    type: r.type,
    status: r.status,
    description: r.description,
    amount: r.amount,
    paid_amount: r.status === 'PAGO' ? r.amount : null,
    due_date: r.due_date,
    payment_date: r.payment_date,
    notes: r.notes,
    import_fitid: r.import_fitid,
  }));

  const { data, error } = await client
    .from('finance_transactions')
    .insert(payload)
    .select('id');

  if (error) throw new Error(`Erro ao inserir transacoes sincronizadas: ${error.message}`);
  return (data as { id: string }[])?.length ?? 0;
}

/** FITIDs (= ids Pluggy) já importados no destino, em blocos (dedup). */
export async function getExistingFitids(
  client: SupabaseClient,
  userId: string,
  target: { accountId?: string; creditCardId?: string },
  fitids: string[]
): Promise<Set<string>> {
  const existing = new Set<string>();
  if (fitids.length === 0) return existing;
  const CHUNK = 100;

  for (let start = 0; start < fitids.length; start += CHUNK) {
    const chunk = fitids.slice(start, start + CHUNK);
    let query = client
      .from('finance_transactions')
      .select('import_fitid')
      .eq('user_id', userId)
      .in('import_fitid', chunk);
    if (target.accountId) query = query.eq('account_id', target.accountId);
    if (target.creditCardId) query = query.eq('credit_card_id', target.creditCardId);

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao verificar transacoes importadas: ${error.message}`);
    for (const row of (data as { import_fitid: string | null }[]) ?? []) {
      if (row.import_fitid) existing.add(row.import_fitid);
    }
  }
  return existing;
}

/** Remove transações sincronizadas por FITID (webhook transactions/deleted). */
export async function deleteSyncedTransactionsByFitids(
  client: SupabaseClient,
  userId: string,
  fitids: string[]
): Promise<number> {
  if (fitids.length === 0) return 0;
  let total = 0;
  const CHUNK = 100;
  for (let start = 0; start < fitids.length; start += CHUNK) {
    const chunk = fitids.slice(start, start + CHUNK);
    const { data, error } = await client
      .from('finance_transactions')
      .delete()
      .eq('user_id', userId)
      .in('import_fitid', chunk)
      .select('id');
    if (error) throw new Error(`Erro ao remover transacoes: ${error.message}`);
    total += (data as { id: string }[])?.length ?? 0;
  }
  return total;
}

export interface GlobalCategoryLite {
  id: string;
  name: string;
  type: FinanceCategoryType;
  parent_id: string | null;
}

/** Catálogo global de categorias — base do resolver de categoria da Pluggy. */
export async function loadGlobalCategories(
  client: SupabaseClient
): Promise<GlobalCategoryLite[]> {
  const { data, error } = await client
    .from('finance_global_categories')
    .select('id, name, type, parent_id')
    .eq('is_active', true);
  if (error) throw new Error(`Erro ao carregar categorias: ${error.message}`);
  return (data as GlobalCategoryLite[]) || [];
}
