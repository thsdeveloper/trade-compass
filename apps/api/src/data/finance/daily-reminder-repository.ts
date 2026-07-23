import { supabaseAdmin } from '../../lib/supabase.js';

/**
 * Consultas do lembrete diário de vencimentos. Rodam no cron (sem token de
 * usuário), então usam supabaseAdmin (service role, ignora RLS) e SEMPRE filtram
 * por user_id explicitamente.
 */

const TRANSACTIONS_TABLE = 'finance_transactions';
const CARDS_TABLE = 'finance_credit_cards';
const INVOICE_PAYMENTS_TABLE = 'finance_invoice_payments';
const PROFILES_TABLE = 'profiles';

export interface ReminderCandidate {
  id: string;
  daily_email_hour: number;
  timezone: string;
  daily_email_last_sent_on: string | null;
}

export interface ReminderBillRow {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  installment_number: number | null;
  total_installments: number | null;
  category: { name: string; icon: string | null; color: string | null } | null;
}

export interface ReminderCardRow {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
}

/** Usuários com o lembrete habilitado (candidatos à varredura horária). */
export async function getReminderCandidates(): Promise<ReminderCandidate[]> {
  const { data, error } = await supabaseAdmin
    .from(PROFILES_TABLE)
    .select('id, daily_email_hour, timezone, daily_email_last_sent_on')
    .eq('daily_email_enabled', true);

  if (error) {
    throw new Error(`Erro ao buscar candidatos do lembrete: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    daily_email_hour: row.daily_email_hour ?? 8,
    timezone: row.timezone ?? 'America/Sao_Paulo',
    daily_email_last_sent_on: row.daily_email_last_sent_on ?? null,
  }));
}

/**
 * Contas avulsas (não-cartão) em aberto com vencimento <= tomorrow. Sem limite
 * inferior de data para incluir atrasadas. Compras de cartão (credit_card_id) e
 * pernas de transferência são excluídas. Cap de segurança de 500 itens.
 */
export async function getReminderBills(
  userId: string,
  tomorrow: string
): Promise<ReminderBillRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TRANSACTIONS_TABLE)
    .select(
      'id, description, amount, due_date, installment_number, total_installments, category:finance_global_categories(name, icon, color)'
    )
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .eq('status', 'PENDENTE')
    .is('credit_card_id', null)
    .is('transfer_id', null)
    .lte('due_date', tomorrow)
    .order('due_date', { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(`Erro ao buscar contas do lembrete: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const catData = row.category as
      | { name: string; icon: string | null; color: string | null }
      | { name: string; icon: string | null; color: string | null }[]
      | null;
    const category = Array.isArray(catData) ? (catData[0] ?? null) : catData;

    return {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date,
      installment_number: row.installment_number ?? null,
      total_installments: row.total_installments ?? null,
      category,
    };
  });
}

/** Cartões ativos do usuário. */
export async function getActiveCreditCards(userId: string): Promise<ReminderCardRow[]> {
  const { data, error } = await supabaseAdmin
    .from(CARDS_TABLE)
    .select('id, name, closing_day, due_day')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Erro ao buscar cartões do lembrete: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    closing_day: row.closing_day,
    due_day: row.due_day,
  }));
}

/**
 * Transações de um cartão numa janela de datas (exclui CANCELADO). O total da
 * fatura é a soma dessas transações (pagas ou não); os pagamentos são tratados à
 * parte via finance_invoice_payments.
 */
export async function getCardTransactionsInWindow(
  userId: string,
  cardId: string,
  start: string,
  end: string
): Promise<{ due_date: string; amount: number }[]> {
  const { data, error } = await supabaseAdmin
    .from(TRANSACTIONS_TABLE)
    .select('due_date, amount')
    .eq('user_id', userId)
    .eq('credit_card_id', cardId)
    .gte('due_date', start)
    .lte('due_date', end)
    .neq('status', 'CANCELADO');

  if (error) {
    throw new Error(`Erro ao buscar transações do cartão: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    due_date: row.due_date,
    amount: Number(row.amount),
  }));
}

/** Pagamentos de fatura de um cartão para um conjunto de meses (YYYY-MM). */
export async function getInvoicePaymentsForMonths(
  userId: string,
  cardId: string,
  months: string[]
): Promise<{ invoice_month: string; amount: number }[]> {
  if (months.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from(INVOICE_PAYMENTS_TABLE)
    .select('invoice_month, amount')
    .eq('user_id', userId)
    .eq('credit_card_id', cardId)
    .in('invoice_month', months);

  if (error) {
    throw new Error(`Erro ao buscar pagamentos de fatura: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    invoice_month: row.invoice_month,
    amount: Number(row.amount),
  }));
}

/** E-mail do usuário (profiles não tem e-mail; vem de auth.users). */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(`Erro ao buscar e-mail do usuário: ${error.message}`);
  }
  return data.user?.email ?? null;
}

/** Marca o lembrete do dia local como enviado/processado (idempotência). */
export async function markReminderSent(userId: string, localDate: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(PROFILES_TABLE)
    .update({ daily_email_last_sent_on: localDate })
    .eq('id', userId);

  if (error) {
    throw new Error(`Erro ao marcar lembrete como enviado: ${error.message}`);
  }
}
