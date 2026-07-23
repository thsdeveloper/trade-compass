import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceRecurrence,
  FinanceTransaction,
  CreateRecurrenceDTO,
  UpdateRecurrenceDTO,
  RecurrenceFrequency,
  RecurrenceWithDetails,
} from '../../domain/finance-types.js';
import { getTransferCategory } from './category-repository.js';
import { createTransfer } from './transaction-repository.js';

const TABLE = 'finance_recurrences';
const TRANSACTIONS_TABLE = 'finance_transactions';

// Teto de ocorrencias materializadas por recorrencia numa unica chamada
// (protege contra recorrencia DIARIA parada ha muito tempo).
const MAX_DUE_OCCURRENCES = 400;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function nextDateISO(currentISO: string, frequency: RecurrenceFrequency): string {
  return calculateNextDate(new Date(currentISO), frequency)
    .toISOString()
    .split('T')[0];
}

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
      category:finance_global_categories!category_id(id, name, color, icon, type),
      account:finance_accounts!account_id(id, name, color, icon),
      destination_account:finance_accounts!destination_account_id(id, name, color, icon),
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

  const isTransfer = recurrence.type === 'TRANSFERENCIA';

  // Para transferencia a categoria e resolvida pelo sistema quando nao vem do
  // cliente (a coluna e NOT NULL; as pernas geradas usam a categoria por tipo).
  let categoryId = recurrence.category_id;
  if (!categoryId) {
    if (!isTransfer) {
      throw new Error('Categoria e obrigatoria');
    }
    categoryId = (await getTransferCategory('DESPESA', accessToken)).id;
  }

  // Pernas de transferencia nascem PAGAS e movem saldo, entao nunca sao
  // pre-geradas no futuro: com inicio futuro, a recorrencia fica agendada
  // (next_occurrence = start_date) e materializa quando a data chegar.
  const deferFirstOccurrence = isTransfer && recurrence.start_date > todayISO();
  const nextOccurrence = deferFirstOccurrence
    ? recurrence.start_date
    : nextDateISO(recurrence.start_date, recurrence.frequency);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      category_id: categoryId,
      account_id: recurrence.account_id || null,
      destination_account_id: recurrence.destination_account_id || null,
      credit_card_id: recurrence.credit_card_id || null,
      description: recurrence.description,
      amount: recurrence.amount,
      type: recurrence.type,
      frequency: recurrence.frequency,
      start_date: recurrence.start_date,
      end_date: recurrence.end_date || null,
      next_occurrence: nextOccurrence,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar recorrencia: ${error.message}`);
  }

  // Criar primeira ocorrencia
  if (isTransfer) {
    if (!deferFirstOccurrence) {
      await createTransfer(
        userId,
        {
          source_account_id: recurrence.account_id!,
          destination_account_id: recurrence.destination_account_id!,
          description: recurrence.description,
          amount: recurrence.amount,
          transfer_date: recurrence.start_date,
          recurrence_id: data.id,
        },
        accessToken
      );
    }
  } else {
    await client.from(TRANSACTIONS_TABLE).insert({
      user_id: userId,
      category_id: categoryId,
      account_id: recurrence.account_id || null,
      credit_card_id: recurrence.credit_card_id || null,
      recurrence_id: data.id,
      type: recurrence.type,
      status: 'PENDENTE',
      description: recurrence.description,
      amount: recurrence.amount,
      due_date: recurrence.start_date,
    });
  }

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

  // Transferencias tem caminho proprio: cada ocorrencia nasce PAGA via
  // createTransfer (move saldo), limitada a datas ate hoje.
  if (recurrence.type === 'TRANSFERENCIA') {
    return generateTransferOccurrences(recurrence, userId, count, accessToken);
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

/**
 * Materializa ocorrencias de uma recorrencia de TRANSFERENCIA. Cada ocorrencia
 * cria as duas pernas via createTransfer (nascem PAGAS e movem saldo), por isso
 * nunca gera datas futuras — apenas ocorrencias com data <= hoje, respeitando
 * end_date e o count solicitado.
 */
async function generateTransferOccurrences(
  recurrence: FinanceRecurrence,
  userId: string,
  count: number,
  accessToken: string
): Promise<FinanceTransaction[]> {
  if (!recurrence.account_id || !recurrence.destination_account_id) {
    throw new Error('Recorrencia de transferencia sem conta de origem/destino');
  }

  const client = createUserClient(accessToken);
  const today = todayISO();
  const created: FinanceTransaction[] = [];

  let currentDate = recurrence.next_occurrence;
  let generated = 0;

  while (generated < count && currentDate <= today) {
    if (recurrence.end_date && currentDate > recurrence.end_date) {
      break;
    }

    const result = await createTransfer(
      userId,
      {
        source_account_id: recurrence.account_id,
        destination_account_id: recurrence.destination_account_id,
        description: recurrence.description,
        amount: recurrence.amount,
        transfer_date: currentDate,
        recurrence_id: recurrence.id,
      },
      accessToken
    );

    created.push(result.source_transaction, result.destination_transaction);
    generated++;
    currentDate = nextDateISO(currentDate, recurrence.frequency);
  }

  if (generated > 0) {
    const { error: updateError } = await client
      .from(TABLE)
      .update({ next_occurrence: currentDate })
      .eq('id', recurrence.id)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Erro ao atualizar recorrencia: ${updateError.message}`);
    }
  }

  return created;
}

/**
 * Materializa, para todas as recorrencias vencidas do usuario, as ocorrencias
 * devidas ate hoje (next_occurrence <= hoje). RECEITA/DESPESA entram como
 * PENDENTE; TRANSFERENCIA cria as duas pernas PAGAS via createTransfer.
 * Recorrencia cujo end_date ja passou e desativada.
 */
export async function generateDueOccurrences(
  userId: string,
  accessToken: string
): Promise<{ generated: number }> {
  const client = createUserClient(accessToken);
  const pending = await getPendingRecurrences(userId, accessToken);
  const today = todayISO();

  let generated = 0;

  for (const recurrence of pending) {
    // end_date ja passou: nada mais a gerar, desativa para sair da fila
    if (recurrence.end_date && recurrence.next_occurrence > recurrence.end_date) {
      await client
        .from(TABLE)
        .update({ is_active: false })
        .eq('id', recurrence.id)
        .eq('user_id', userId);
      continue;
    }

    if (recurrence.type === 'TRANSFERENCIA') {
      const legs = await generateTransferOccurrences(
        recurrence,
        userId,
        MAX_DUE_OCCURRENCES,
        accessToken
      );
      generated += legs.length / 2;
      continue;
    }

    // RECEITA/DESPESA: gerar em lote todas as datas devidas ate hoje
    const rows: Array<Record<string, unknown>> = [];
    let currentDate = recurrence.next_occurrence;
    while (
      currentDate <= today &&
      (!recurrence.end_date || currentDate <= recurrence.end_date) &&
      rows.length < MAX_DUE_OCCURRENCES
    ) {
      rows.push({
        user_id: userId,
        category_id: recurrence.category_id,
        account_id: recurrence.account_id,
        credit_card_id: recurrence.credit_card_id,
        recurrence_id: recurrence.id,
        type: recurrence.type,
        status: 'PENDENTE',
        description: recurrence.description,
        amount: recurrence.amount,
        due_date: currentDate,
      });
      currentDate = nextDateISO(currentDate, recurrence.frequency);
    }

    if (rows.length === 0) continue;

    const { error: insertError } = await client
      .from(TRANSACTIONS_TABLE)
      .insert(rows);

    if (insertError) {
      throw new Error(`Erro ao gerar transacoes: ${insertError.message}`);
    }

    const { error: updateError } = await client
      .from(TABLE)
      .update({ next_occurrence: currentDate })
      .eq('id', recurrence.id)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Erro ao atualizar recorrencia: ${updateError.message}`);
    }

    generated += rows.length;
  }

  return { generated };
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
