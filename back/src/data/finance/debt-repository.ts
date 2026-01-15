import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceDebt,
  FinanceDebtNegotiation,
  FinanceTransaction,
  DebtWithNegotiation,
  CreateDebtDTO,
  UpdateDebtDTO,
  CreateNegotiationDTO,
  UpdateNegotiationDTO,
  GenerateTransactionsDTO,
  DebtFilters,
  DebtSummary,
} from '../../domain/finance-types.js';

const DEBTS_TABLE = 'finance_debts';
const NEGOTIATIONS_TABLE = 'finance_debt_negotiations';
const TRANSACTIONS_TABLE = 'finance_transactions';

// ==================== DEBT CRUD ====================

export async function getDebtsByUser(
  userId: string,
  filters: DebtFilters,
  accessToken: string
): Promise<DebtWithNegotiation[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(DEBTS_TABLE)
    .select(`
      *,
      active_negotiation:finance_debt_negotiations!debt_id(*)
    `)
    .eq('user_id', userId)
    .neq('status', 'CANCELADA');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.debt_type) {
    query = query.eq('debt_type', filters.debt_type);
  }
  if (filters.creditor_name) {
    query = query.ilike('creditor_name', `%${filters.creditor_name}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar dividas: ${error.message}`);
  }

  // Processar para retornar apenas negociacao ativa
  const debts = (data || []).map((debt) => {
    const negotiations = debt.active_negotiation as FinanceDebtNegotiation[] | null;
    const activeNegotiation = negotiations?.find((n) => n.is_active) || null;
    return {
      ...debt,
      active_negotiation: activeNegotiation,
    };
  });

  return debts;
}

export async function getDebtById(
  debtId: string,
  userId: string,
  accessToken: string
): Promise<DebtWithNegotiation | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DEBTS_TABLE)
    .select(`
      *,
      active_negotiation:finance_debt_negotiations!debt_id(*)
    `)
    .eq('id', debtId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar divida: ${error.message}`);
  }

  // Processar para retornar apenas negociacao ativa
  const negotiations = data.active_negotiation as FinanceDebtNegotiation[] | null;
  const activeNegotiation = negotiations?.find((n) => n.is_active) || null;

  return {
    ...data,
    active_negotiation: activeNegotiation,
  };
}

export async function createDebt(
  userId: string,
  debt: CreateDebtDTO,
  accessToken: string
): Promise<FinanceDebt> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DEBTS_TABLE)
    .insert({
      user_id: userId,
      creditor_name: debt.creditor_name,
      debt_type: debt.debt_type,
      original_amount: debt.original_amount,
      updated_amount: debt.updated_amount,
      original_due_date: debt.original_due_date,
      status: 'EM_ABERTO',
      contract_number: debt.contract_number || null,
      creditor_document: debt.creditor_document || null,
      creditor_contact_phone: debt.creditor_contact_phone || null,
      creditor_contact_email: debt.creditor_contact_email || null,
      notes: debt.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar divida: ${error.message}`);
  }

  return data;
}

export async function updateDebt(
  debtId: string,
  userId: string,
  updates: UpdateDebtDTO,
  accessToken: string
): Promise<FinanceDebt> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DEBTS_TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar divida: ${error.message}`);
  }

  if (!data) {
    throw new Error('Divida nao encontrada');
  }

  return data;
}

export async function deleteDebt(
  debtId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(DEBTS_TABLE)
    .update({ status: 'CANCELADA', updated_at: new Date().toISOString() })
    .eq('id', debtId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao cancelar divida: ${error.message}`);
  }
}

// ==================== NEGOTIATION CRUD ====================

export async function getNegotiationsByDebt(
  debtId: string,
  userId: string,
  accessToken: string
): Promise<FinanceDebtNegotiation[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(NEGOTIATIONS_TABLE)
    .select('*')
    .eq('debt_id', debtId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar negociacoes: ${error.message}`);
  }

  return data || [];
}

export async function createNegotiation(
  userId: string,
  debtId: string,
  negotiation: CreateNegotiationDTO,
  accessToken: string
): Promise<FinanceDebtNegotiation> {
  const client = createUserClient(accessToken);

  // 1. Desativar negociacao anterior se existir
  await client
    .from(NEGOTIATIONS_TABLE)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('debt_id', debtId)
    .eq('user_id', userId)
    .eq('is_active', true);

  // 2. Calcular valor da parcela
  const totalInstallments = negotiation.payment_method === 'A_VISTA' ? 1 : (negotiation.total_installments || 1);
  const installmentValue = negotiation.negotiated_value / totalInstallments;

  // 3. Criar nova negociacao
  const { data, error } = await client
    .from(NEGOTIATIONS_TABLE)
    .insert({
      user_id: userId,
      debt_id: debtId,
      payment_method: negotiation.payment_method,
      total_installments: totalInstallments,
      negotiated_value: negotiation.negotiated_value,
      installment_value: installmentValue,
      first_payment_date: negotiation.first_payment_date,
      protocol_number: negotiation.protocol_number || null,
      contact_person: negotiation.contact_person || null,
      contact_phone: negotiation.contact_phone || null,
      contact_email: negotiation.contact_email || null,
      notes: negotiation.notes || null,
      status: 'PENDENTE',
      is_active: true,
      transactions_generated: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar negociacao: ${error.message}`);
  }

  // 4. Atualizar status da divida
  await client
    .from(DEBTS_TABLE)
    .update({ status: 'EM_NEGOCIACAO', updated_at: new Date().toISOString() })
    .eq('id', debtId)
    .eq('user_id', userId);

  return data;
}

export async function updateNegotiation(
  debtId: string,
  negotiationId: string,
  userId: string,
  updates: UpdateNegotiationDTO,
  accessToken: string
): Promise<FinanceDebtNegotiation> {
  const client = createUserClient(accessToken);

  // Recalcular valor da parcela se necessario
  let updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.negotiated_value !== undefined || updates.total_installments !== undefined) {
    // Buscar negociacao atual para pegar valores
    const { data: current } = await client
      .from(NEGOTIATIONS_TABLE)
      .select('*')
      .eq('id', negotiationId)
      .eq('debt_id', debtId)
      .eq('user_id', userId)
      .single();

    if (current) {
      const negotiatedValue = updates.negotiated_value ?? current.negotiated_value;
      const totalInstallments = updates.total_installments ?? current.total_installments;
      updateData.installment_value = negotiatedValue / totalInstallments;
    }
  }

  const { data, error } = await client
    .from(NEGOTIATIONS_TABLE)
    .update(updateData)
    .eq('id', negotiationId)
    .eq('debt_id', debtId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar negociacao: ${error.message}`);
  }

  if (!data) {
    throw new Error('Negociacao nao encontrada');
  }

  return data;
}

// ==================== GENERATE TRANSACTIONS ====================

export async function generateTransactionsFromNegotiation(
  userId: string,
  debtId: string,
  negotiationId: string,
  params: GenerateTransactionsDTO,
  accessToken: string
): Promise<FinanceTransaction[]> {
  const client = createUserClient(accessToken);

  // 1. Buscar negociacao
  const { data: negotiation, error: negError } = await client
    .from(NEGOTIATIONS_TABLE)
    .select('*')
    .eq('id', negotiationId)
    .eq('debt_id', debtId)
    .eq('user_id', userId)
    .single();

  if (negError || !negotiation) {
    throw new Error('Negociacao nao encontrada');
  }

  if (negotiation.transactions_generated) {
    throw new Error('Transacoes ja foram geradas para esta negociacao');
  }

  // 2. Buscar divida para descricao
  const { data: debt, error: debtError } = await client
    .from(DEBTS_TABLE)
    .select('creditor_name')
    .eq('id', debtId)
    .eq('user_id', userId)
    .single();

  if (debtError || !debt) {
    throw new Error('Divida nao encontrada');
  }

  // 3. Gerar UUID para agrupar transacoes
  const groupId = crypto.randomUUID();

  // 4. Criar transacoes
  const transactions: Record<string, unknown>[] = [];
  const firstDate = new Date(negotiation.first_payment_date);

  for (let i = 0; i < negotiation.total_installments; i++) {
    const dueDate = new Date(firstDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const description =
      negotiation.total_installments > 1
        ? `Pagamento ${debt.creditor_name} (${i + 1}/${negotiation.total_installments})`
        : `Pagamento ${debt.creditor_name}`;

    transactions.push({
      user_id: userId,
      category_id: params.category_id,
      account_id: params.account_id,
      debt_id: debtId,
      debt_negotiation_id: negotiationId,
      installment_group_id: groupId,
      type: 'DESPESA',
      status: 'PENDENTE',
      description,
      amount: negotiation.installment_value,
      due_date: dueDate.toISOString().split('T')[0],
      installment_number: i + 1,
      total_installments: negotiation.total_installments,
    });
  }

  const { data: created, error: txError } = await client
    .from(TRANSACTIONS_TABLE)
    .insert(transactions)
    .select();

  if (txError) {
    throw new Error(`Erro ao criar transacoes: ${txError.message}`);
  }

  // 5. Atualizar negociacao
  await client
    .from(NEGOTIATIONS_TABLE)
    .update({
      transactions_generated: true,
      transaction_group_id: groupId,
      status: 'APROVADA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', negotiationId);

  // 6. Atualizar status da divida
  await client
    .from(DEBTS_TABLE)
    .update({
      status: 'NEGOCIADA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtId);

  return created || [];
}

// ==================== DEBT SUMMARY ====================

export async function getDebtSummary(
  userId: string,
  accessToken: string
): Promise<DebtSummary> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DEBTS_TABLE)
    .select('status, updated_amount')
    .eq('user_id', userId)
    .neq('status', 'CANCELADA');

  if (error) {
    throw new Error(`Erro ao buscar resumo de dividas: ${error.message}`);
  }

  const debts = data || [];

  // Calcular totais
  const statusCount: Record<string, { count: number; total: number }> = {};
  let totalOpenAmount = 0;
  let totalNegotiatedAmount = 0;

  for (const debt of debts) {
    const status = debt.status as string;
    if (!statusCount[status]) {
      statusCount[status] = { count: 0, total: 0 };
    }
    statusCount[status].count++;
    statusCount[status].total += debt.updated_amount;

    if (status === 'EM_ABERTO' || status === 'EM_NEGOCIACAO') {
      totalOpenAmount += debt.updated_amount;
    } else if (status === 'NEGOCIADA') {
      totalNegotiatedAmount += debt.updated_amount;
    }
  }

  const debtsByStatus = Object.entries(statusCount).map(([status, data]) => ({
    status: status as 'EM_ABERTO' | 'EM_NEGOCIACAO' | 'NEGOCIADA' | 'QUITADA' | 'CANCELADA',
    count: data.count,
    total: data.total,
  }));

  return {
    total_debts: debts.length,
    total_open_amount: totalOpenAmount,
    total_negotiated_amount: totalNegotiatedAmount,
    debts_by_status: debtsByStatus,
  };
}
