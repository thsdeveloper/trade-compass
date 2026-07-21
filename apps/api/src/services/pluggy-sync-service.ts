import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account, AccountType, Item } from 'pluggy-sdk';
import { getPluggyClient } from '../lib/pluggy.js';
import {
  upsertPluggyItem,
  upsertPluggyAccount,
  getPluggyAccountMapping,
  touchPluggyItemSynced,
  createSyncedAccount,
  createSyncedCreditCard,
  insertSyncedTransactions,
  setAccountBalance,
  setCardAvailableLimit,
  getExistingFitids,
  loadGlobalCategories,
  updatePluggyItemStatus,
  type SyncedTransactionInput,
  type GlobalCategoryLite,
} from '../data/finance/pluggy-repository.js';
import type {
  FinanceAccountType,
  CreditCardBrand,
  FinanceCategoryType,
  TransactionStatus,
} from '../domain/finance-types.js';
import type { PluggySyncResult } from '../domain/pluggy-types.js';

/** Erro de posse: o Item nao pertence ao usuario que tentou registra-lo. */
export class PluggyOwnershipError extends Error {
  constructor() {
    super('Esta conexao nao pertence ao usuario');
    this.name = 'PluggyOwnershipError';
  }
}

// Backfill: só os últimos 12 meses (limita o volume em contas reais; o sandbox
// tem pouca coisa). O sync incremental (webhooks) cobre o resto.
const MONTHS_BACK = 12;

function isoDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function dayOfMonth(value: Date | string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  const day = date.getUTCDate();
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : fallback;
}

function mapBrand(raw: string | null): CreditCardBrand {
  const b = (raw ?? '').toUpperCase();
  if (b.includes('VISA')) return 'VISA';
  if (b.includes('MASTER')) return 'MASTERCARD';
  if (b.includes('ELO')) return 'ELO';
  if (b.includes('AMEX') || b.includes('AMERICAN')) return 'AMEX';
  if (b.includes('HIPER')) return 'HIPERCARD';
  return 'OUTROS';
}

// Convenção de sinal (verificada nos docs da Pluggy):
//  - BANK: saída (amount < 0) = DESPESA, entrada (amount >= 0) = RECEITA.
//  - CREDIT (cartão): INVERTIDO — compra (amount > 0) = DESPESA, pagamento da
//    fatura (amount < 0) = RECEITA.
function mapType(accountType: AccountType, amount: number): FinanceCategoryType {
  if (accountType === 'CREDIT') return amount > 0 ? 'DESPESA' : 'RECEITA';
  return amount < 0 ? 'DESPESA' : 'RECEITA';
}

// ============================================================================
// Resolver de categoria (Fase 3): casa a categoria da Pluggy (em português para
// conectores BR) com o catálogo global por nome normalizado; sem match, cai em
// "Não categorizado". Nunca força uma categoria errada.
// ============================================================================
function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (combining marks)
    .toLowerCase()
    .trim();
}

interface CategoryResolver {
  resolve(type: FinanceCategoryType, pluggyCategory: string | null): string;
}

function buildCategoryResolver(cats: GlobalCategoryLite[]): CategoryResolver {
  const byNameType = new Map<string, string>();
  const uncategorized = new Map<FinanceCategoryType, string>();
  const anyOfType = new Map<FinanceCategoryType, string>();
  const uncatKey = normalizeName('Não categorizado');

  for (const c of cats) {
    if (c.type !== 'RECEITA' && c.type !== 'DESPESA') continue;
    const norm = normalizeName(c.name);
    const key = `${c.type}|${norm}`;
    if (!byNameType.has(key)) byNameType.set(key, c.id);
    if (norm === uncatKey) uncategorized.set(c.type, c.id);
    if (!anyOfType.has(c.type)) anyOfType.set(c.type, c.id);
  }

  return {
    resolve(type, pluggyCategory) {
      if (pluggyCategory) {
        const match = byNameType.get(`${type}|${normalizeName(pluggyCategory)}`);
        if (match) return match;
      }
      return uncategorized.get(type) ?? anyOfType.get(type) ?? '';
    },
  };
}

interface AccountTxContext {
  accountId?: string;
  creditCardId?: string;
  resolver: CategoryResolver;
  dateFrom: string;
}

async function syncAccountTransactions(
  client: SupabaseClient,
  userId: string,
  acc: Account,
  ctx: AccountTxContext
): Promise<number> {
  const pluggy = getPluggyClient();
  const txns = await pluggy.fetchAllTransactions(acc.id, { dateFrom: ctx.dateFrom });
  if (txns.length === 0) return 0;

  const fitids = txns.map((t) => t.id);
  const existing = await getExistingFitids(
    client,
    userId,
    { accountId: ctx.accountId, creditCardId: ctx.creditCardId },
    fitids
  );

  const isCard = Boolean(ctx.creditCardId);
  const rows: SyncedTransactionInput[] = [];
  for (const t of txns) {
    if (existing.has(t.id)) continue; // já importada (dedup idempotente)
    const type = mapType(acc.type, t.amount);
    // Cartão: a compra fica PENDENTE (é quitada depois via fatura, igual ao
    // fluxo nativo do cartão). Extrato de conta: movimento liquidado = PAGO
    // (a menos que a Pluggy marque a transação como ainda PENDING).
    const status: TransactionStatus = isCard
      ? 'PENDENTE'
      : t.status === 'PENDING'
        ? 'PENDENTE'
        : 'PAGO';
    const due = isoDate(t.date);
    rows.push({
      category_id: ctx.resolver.resolve(type, t.category),
      account_id: ctx.accountId ?? null,
      credit_card_id: ctx.creditCardId ?? null,
      type,
      status,
      description: (t.description || t.descriptionRaw || 'Transacao').slice(0, 255),
      amount: Math.abs(t.amount),
      due_date: due,
      payment_date: status === 'PAGO' ? due : null,
      notes: t.category ?? null,
      import_fitid: t.id,
    });
  }

  return insertSyncedTransactions(client, userId, rows);
}

/**
 * Sincroniza um Item da Pluggy no domínio financeiro existente. Idempotente:
 * reusa os vínculos (pluggy_accounts) e o dedup por import_fitid, então
 * re-executar (backfill OU webhook) não duplica nada.
 *
 * `client` é injetado: a rota autenticada passa o client RLS do usuário; o
 * webhook (sem JWT) passa o supabaseAdmin (service_role).
 */
export async function syncPluggyItem(
  client: SupabaseClient,
  userId: string,
  pluggyItemId: string
): Promise<PluggySyncResult> {
  const pluggy = getPluggyClient();
  const item: Item = await pluggy.fetchItem(pluggyItemId);

  // Segurança: o connect-token carimba clientUserId = user.id, então o Item
  // pertence a quem o criou. Bloqueia sincronizar o Item de outra pessoa.
  if (item.clientUserId && item.clientUserId !== userId) {
    throw new PluggyOwnershipError();
  }

  await upsertPluggyItem({
    user_id: userId,
    pluggy_item_id: item.id,
    connector_id: item.connector?.id ?? null,
    connector_name: item.connector?.name ?? null,
    connector_image_url: item.connector?.imageUrl ?? null,
    status: item.status ?? null,
    execution_status: item.executionStatus ?? null,
    consent_expires_at: item.consentExpiresAt
      ? new Date(item.consentExpiresAt).toISOString()
      : null,
    pluggy_created_at: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    pluggy_updated_at: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
  });

  const resolver = buildCategoryResolver(await loadGlobalCategories(client));
  const dateFrom = isoDate(new Date(Date.now() - MONTHS_BACK * 30 * 24 * 60 * 60 * 1000));
  const connectorColor = item.connector?.primaryColor || undefined;

  const { results: accounts } = await pluggy.fetchAccounts(pluggyItemId);

  let accountsCreated = 0;
  let cardsCreated = 0;
  let transactionsCreated = 0;

  for (const acc of accounts) {
    const mapping = await getPluggyAccountMapping(acc.id);

    if (acc.type === 'CREDIT') {
      const credit = acc.creditData;
      const totalLimit = credit?.creditLimit ?? 0;
      const availableLimit = credit?.availableCreditLimit ?? totalLimit;

      let cardId = mapping?.finance_credit_card_id ?? null;
      if (!cardId) {
        cardId = await createSyncedCreditCard(client, userId, {
          name: acc.name || acc.marketingName || item.connector?.name || 'Cartao',
          brand: mapBrand(credit?.brand ?? null),
          total_limit: totalLimit,
          available_limit: availableLimit,
          closing_day: dayOfMonth(credit?.balanceCloseDate, 1),
          due_day: dayOfMonth(credit?.balanceDueDate, 10),
          color: connectorColor || '#8b5cf6',
        });
        cardsCreated++;
      } else {
        await setCardAvailableLimit(client, cardId, userId, availableLimit);
      }

      await upsertPluggyAccount({
        user_id: userId,
        pluggy_item_id: item.id,
        pluggy_account_id: acc.id,
        pluggy_type: acc.type,
        pluggy_subtype: acc.subtype,
        finance_account_id: null,
        finance_credit_card_id: cardId,
        last_balance: acc.balance ?? null,
      });

      transactionsCreated += await syncAccountTransactions(client, userId, acc, {
        creditCardId: cardId,
        resolver,
        dateFrom,
      });
    } else {
      // BANK (corrente / poupança)
      const type: FinanceAccountType =
        acc.subtype === 'SAVINGS_ACCOUNT' ? 'POUPANCA' : 'CONTA_CORRENTE';

      let accountId = mapping?.finance_account_id ?? null;
      if (!accountId) {
        accountId = await createSyncedAccount(client, userId, {
          name: acc.name || acc.marketingName || item.connector?.name || 'Conta',
          type,
          bank_id: null, // best-effort no MVP; mapa connector->banks fica pra depois
          balance: acc.balance ?? 0,
          color: connectorColor || '#10b981',
          icon: 'Landmark',
        });
        accountsCreated++;
      }

      await upsertPluggyAccount({
        user_id: userId,
        pluggy_item_id: item.id,
        pluggy_account_id: acc.id,
        pluggy_type: acc.type,
        pluggy_subtype: acc.subtype,
        finance_account_id: accountId,
        finance_credit_card_id: null,
        last_balance: acc.balance ?? null,
      });

      transactionsCreated += await syncAccountTransactions(client, userId, acc, {
        accountId,
        resolver,
        dateFrom,
      });

      // Saldo definido DIRETO do valor autoritativo da Pluggy — nunca o ajuste
      // incremental (que contaria em dobro).
      await setAccountBalance(client, accountId, userId, acc.balance ?? 0);
    }
  }

  await touchPluggyItemSynced(item.id);

  return {
    accounts_created: accountsCreated,
    credit_cards_created: cardsCreated,
    transactions_created: transactionsCreated,
  };
}

/** Revoga a conexão na Pluggy (LGPD). 404 = já removida (idempotente). */
export async function deletePluggyItemRemote(pluggyItemId: string): Promise<void> {
  const pluggy = getPluggyClient();
  try {
    await pluggy.deleteItem(pluggyItemId);
  } catch (err) {
    const status =
      (err as { code?: number }).code ?? (err as { status?: number }).status;
    if (status === 404) return; // já não existe na Pluggy — sucesso
    throw err;
  }
}

/** Re-busca o Item e atualiza status/execution/consent (webhooks item/*). */
export async function refreshPluggyItemStatus(pluggyItemId: string): Promise<void> {
  const pluggy = getPluggyClient();
  const item = await pluggy.fetchItem(pluggyItemId);
  const { updatePluggyItemStatus } = await import(
    '../data/finance/pluggy-repository.js'
  );
  await updatePluggyItemStatus(pluggyItemId, {
    status: item.status ?? null,
    execution_status: item.executionStatus ?? null,
    consent_expires_at: item.consentExpiresAt
      ? new Date(item.consentExpiresAt).toISOString()
      : null,
  });
}
