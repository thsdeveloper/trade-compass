import { createUserClient } from '../../lib/supabase.js';

const TRANSACTIONS_TABLE = 'finance_transactions';
const JUNCTION_TABLE = 'finance_transaction_tags';
const INVOICE_PAYMENTS_TABLE = 'finance_invoice_payments';
const RECURRENCES_TABLE = 'finance_recurrences';
const ACCOUNTS_TABLE = 'finance_accounts';
const CREDIT_CARDS_TABLE = 'finance_credit_cards';

export interface ResetTransactionsResult {
  transactions_deleted: number;
  invoice_payments_deleted: number;
  recurrences_deleted: number;
  accounts_reset: number;
  credit_cards_reset: number;
}

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Apaga TODOS os lancamentos do usuario (transacoes, vinculos de tags,
 * pagamentos de fatura e recorrencias) e reseta os saldos das contas para o
 * saldo inicial e o limite disponivel dos cartoes para o limite total.
 *
 * Mantem intactos: contas, cartoes, categorias, tags, metas (e contribuicoes
 * manuais), dividas, renda fixa e financiamentos.
 */
export interface ResetTransactionsOptions {
  /** Se true, zera tambem o saldo inicial das contas (tudo fica R$ 0,00) */
  zeroInitialBalances?: boolean;
}

export async function resetAllTransactions(
  userId: string,
  accessToken: string,
  options: ResetTransactionsOptions = {}
): Promise<ResetTransactionsResult> {
  const client = createUserClient(accessToken);

  // 1. Buscar IDs das transacoes para limpar a tabela pivo de tags
  const { data: txRows, error: txListError } = await client
    .from(TRANSACTIONS_TABLE)
    .select('id')
    .eq('user_id', userId);

  if (txListError) {
    throw new Error(`Erro ao listar transacoes: ${txListError.message}`);
  }

  const transactionIds = (txRows || []).map((row) => row.id as string);

  // 2. Apagar vinculos transacao-tag (a pivo nao tem user_id)
  for (const ids of chunk(transactionIds, CHUNK_SIZE)) {
    const { error } = await client
      .from(JUNCTION_TABLE)
      .delete()
      .in('transaction_id', ids);
    if (error) {
      throw new Error(`Erro ao limpar tags das transacoes: ${error.message}`);
    }
  }

  // 3. Apagar transacoes (antes dos pagamentos de fatura, por causa da FK invoice_payment_id)
  const { error: txError, count: txCount } = await client
    .from(TRANSACTIONS_TABLE)
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (txError) {
    throw new Error(`Erro ao apagar transacoes: ${txError.message}`);
  }

  // 4. Apagar pagamentos de fatura
  const { error: invoiceError, count: invoiceCount } = await client
    .from(INVOICE_PAYMENTS_TABLE)
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (invoiceError) {
    throw new Error(`Erro ao apagar pagamentos de fatura: ${invoiceError.message}`);
  }

  // 5. Apagar recorrencias
  const { error: recurrenceError, count: recurrenceCount } = await client
    .from(RECURRENCES_TABLE)
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (recurrenceError) {
    throw new Error(`Erro ao apagar recorrencias: ${recurrenceError.message}`);
  }

  // 6. Resetar saldo das contas (para o saldo inicial, ou tudo zerado se solicitado)
  const { data: accounts, error: accountsError } = await client
    .from(ACCOUNTS_TABLE)
    .select('id, initial_balance')
    .eq('user_id', userId);
  if (accountsError) {
    throw new Error(`Erro ao listar contas: ${accountsError.message}`);
  }

  for (const account of accounts || []) {
    const updates = options.zeroInitialBalances
      ? { initial_balance: 0, current_balance: 0 }
      : { current_balance: account.initial_balance };
    const { error } = await client
      .from(ACCOUNTS_TABLE)
      .update(updates)
      .eq('id', account.id)
      .eq('user_id', userId);
    if (error) {
      throw new Error(`Erro ao resetar saldo da conta: ${error.message}`);
    }
  }

  // 7. Resetar limite disponivel dos cartoes para o limite total
  const { data: cards, error: cardsError } = await client
    .from(CREDIT_CARDS_TABLE)
    .select('id, total_limit')
    .eq('user_id', userId);
  if (cardsError) {
    throw new Error(`Erro ao listar cartoes: ${cardsError.message}`);
  }

  for (const card of cards || []) {
    const { error } = await client
      .from(CREDIT_CARDS_TABLE)
      .update({ available_limit: card.total_limit })
      .eq('id', card.id)
      .eq('user_id', userId);
    if (error) {
      throw new Error(`Erro ao resetar limite do cartao: ${error.message}`);
    }
  }

  return {
    transactions_deleted: txCount ?? transactionIds.length,
    invoice_payments_deleted: invoiceCount ?? 0,
    recurrences_deleted: recurrenceCount ?? 0,
    accounts_reset: accounts?.length ?? 0,
    credit_cards_reset: cards?.length ?? 0,
  };
}
