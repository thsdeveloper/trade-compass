import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceRecurrence,
  FinanceTransaction,
  CreateRecurrenceDTO,
  UpdateRecurrenceDTO,
  RecurrenceFrequency,
  RecurrenceWithDetails,
} from '../../domain/finance-types.js';

const TABLE = 'finance_recurrences';
const TRANSACTIONS_TABLE = 'finance_transactions';

// Calcular proxima data baseada na frequencia
function calculateNextDate(currentDate: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'DIARIA':
      next.setDate(next.getDate() + 1);
      break;
    case 'SEMANAL':
      next.setDate(next.getDate() + 7);
      break;
    case 'QUINZENAL':
      next.setDate(next.getDate() + 15);
      break;
    case 'MENSAL':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'BIMESTRAL':
      next.setMonth(next.getMonth() + 2);
      break;
    case 'TRIMESTRAL':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMESTRAL':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'ANUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export async function getRecurrencesByUser(
  userId: string,
  accessToken: string
): Promise<RecurrenceWithDetails[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select(
      `
      *,
      category:finance_categories!category_id(id, name, color, icon, type),
      account:finance_accounts!account_id(id, name, color, icon),
      credit_card:finance_credit_cards!credit_card_id(id, name, brand, color)
    `
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('description', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar recorrencias: ${error.message}`);
  }

  return data || [];
}

export async function getRecurrenceById(
  recurrenceId: string,
  userId: string,
  accessToken: string
): Promise<FinanceRecurrence | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', recurrenceId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar recorrencia: ${error.message}`);
  }

  return data;
}

export async function createRecurrence(
  userId: string,
  recurrence: CreateRecurrenceDTO,
  accessToken: string
): Promise<FinanceRecurrence> {
  const client = createUserClient(accessToken);

  const startDate = new Date(recurrence.start_date);
  const nextOccurrence = calculateNextDate(startDate, recurrence.frequency);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      category_id: recurrence.category_id,
      account_id: recurrence.account_id || null,
      credit_card_id: recurrence.credit_card_id || null,
      description: recurrence.description,
      amount: recurrence.amount,
      type: recurrence.type,
      frequency: recurrence.frequency,
      start_date: recurrence.start_date,
      end_date: recurrence.end_date || null,
      next_occurrence: nextOccurrence.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar recorrencia: ${error.message}`);
  }

  // Criar primeira transacao
  await client.from(TRANSACTIONS_TABLE).insert({
    user_id: userId,
    category_id: recurrence.category_id,
    account_id: recurrence.account_id || null,
    credit_card_id: recurrence.credit_card_id || null,
    recurrence_id: data.id,
    type: recurrence.type,
    status: 'PENDENTE',
    description: recurrence.description,
    amount: recurrence.amount,
    due_date: recurrence.start_date,
  });

  return data;
}

export async function updateRecurrence(
  recurrenceId: string,
  userId: string,
  updates: UpdateRecurrenceDTO,
  accessToken: string
): Promise<FinanceRecurrence> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', recurrenceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar recorrencia: ${error.message}`);
  }

  if (!data) {
    throw new Error('Recorrencia nao encontrada');
  }

  return data;
}

export async function deleteRecurrence(
  recurrenceId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Soft delete - apenas desativa
  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', recurrenceId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover recorrencia: ${error.message}`);
  }
}

export async function generateNextOccurrences(
  recurrenceId: string,
  userId: string,
  count: number,
  accessToken: string
): Promise<FinanceTransaction[]> {
  const client = createUserClient(accessToken);

  // Buscar recorrencia
  const recurrence = await getRecurrenceById(recurrenceId, userId, accessToken);
  if (!recurrence) {
    throw new Error('Recorrencia nao encontrada');
  }

  if (!recurrence.is_active) {
    throw new Error('Recorrencia esta inativa');
  }

  const transactions: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>[] = [];
  let currentDate = new Date(recurrence.next_occurrence);
  const endDate = recurrence.end_date ? new Date(recurrence.end_date) : null;

  for (let i = 0; i < count; i++) {
    // Verificar se passou da data final
    if (endDate && currentDate > endDate) {
      break;
    }

    transactions.push({
      user_id: userId,
      category_id: recurrence.category_id,
      account_id: recurrence.account_id,
      credit_card_id: recurrence.credit_card_id,
      recurrence_id: recurrence.id,
      installment_group_id: null,
      invoice_payment_id: null,
      debt_id: null,
      debt_negotiation_id: null,
      transfer_id: null,
      goal_id: null,
      type: recurrence.type,
      status: 'PENDENTE',
      description: recurrence.description,
      amount: recurrence.amount,
      paid_amount: null,
      due_date: currentDate.toISOString().split('T')[0],
      payment_date: null,
      installment_number: null,
      total_installments: null,
      notes: null,
    });

    currentDate = calculateNextDate(currentDate, recurrence.frequency);
  }

  if (transactions.length === 0) {
    return [];
  }

  // Inserir transacoes
  const { data: created, error: insertError } = await client
    .from(TRANSACTIONS_TABLE)
    .insert(transactions)
    .select();

  if (insertError) {
    throw new Error(`Erro ao gerar transacoes: ${insertError.message}`);
  }

  // Atualizar proxima ocorrencia da recorrencia
  const { error: updateError } = await client
    .from(TABLE)
    .update({ next_occurrence: currentDate.toISOString().split('T')[0] })
    .eq('id', recurrenceId)
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Erro ao atualizar recorrencia: ${updateError.message}`);
  }

  return created || [];
}

// Buscar recorrencias que precisam gerar transacoes
export async function getPendingRecurrences(
  userId: string,
  accessToken: string
): Promise<FinanceRecurrence[]> {
  const client = createUserClient(accessToken);

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lte('next_occurrence', today);

  if (error) {
    throw new Error(`Erro ao buscar recorrencias pendentes: ${error.message}`);
  }

  return data || [];
}
