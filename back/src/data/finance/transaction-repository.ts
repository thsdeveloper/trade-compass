import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceTransaction,
  CreateTransactionDTO,
  CreateInstallmentTransactionDTO,
  UpdateTransactionDTO,
  PayTransactionDTO,
  TransactionFilters,
  TransactionWithCategory,
} from '../../domain/finance-types.js';
import { updateAccountBalance, getAccountById } from './account-repository.js';
import { updateCreditCardAvailableLimit } from './credit-card-repository.js';

const TABLE = 'finance_transactions';

export async function getTransactionsByUser(
  userId: string,
  filters: TransactionFilters,
  accessToken: string
): Promise<TransactionWithCategory[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(TABLE)
    .select(`
      *,
      category:finance_categories(*),
      account:finance_accounts(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  // Aplicar filtros
  if (filters.start_date) {
    query = query.gte('due_date', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('due_date', filters.end_date);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }
  if (filters.credit_card_id) {
    query = query.eq('credit_card_id', filters.credit_card_id);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('due_date', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar transacoes: ${error.message}`);
  }

  return data || [];
}

export async function getTransactionById(
  transactionId: string,
  userId: string,
  accessToken: string
): Promise<TransactionWithCategory | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select(`
      *,
      category:finance_categories(*),
      account:finance_accounts(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar transacao: ${error.message}`);
  }

  return data;
}

export async function createTransaction(
  userId: string,
  transaction: CreateTransactionDTO,
  accessToken: string
): Promise<FinanceTransaction> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      category_id: transaction.category_id,
      account_id: transaction.account_id || null,
      credit_card_id: transaction.credit_card_id || null,
      type: transaction.type,
      status: 'PENDENTE',
      description: transaction.description,
      amount: transaction.amount,
      due_date: transaction.due_date,
      notes: transaction.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar transacao: ${error.message}`);
  }

  // Se for despesa no cartao, diminuir limite disponivel
  if (transaction.type === 'DESPESA' && transaction.credit_card_id) {
    await updateCreditCardAvailableLimit(
      transaction.credit_card_id,
      userId,
      -transaction.amount,
      accessToken
    );
  }

  return data;
}

export async function createInstallmentTransactions(
  userId: string,
  data: CreateInstallmentTransactionDTO,
  accessToken: string
): Promise<FinanceTransaction[]> {
  const client = createUserClient(accessToken);

  // Gerar UUID para agrupar parcelas
  const installmentGroupId = crypto.randomUUID();
  const installmentAmount = data.total_amount / data.total_installments;

  const transactions: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>[] = [];
  const firstDate = new Date(data.first_due_date);

  for (let i = 0; i < data.total_installments; i++) {
    const dueDate = new Date(firstDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    transactions.push({
      user_id: userId,
      category_id: data.category_id,
      account_id: data.account_id || null,
      credit_card_id: data.credit_card_id || null,
      recurrence_id: null,
      installment_group_id: installmentGroupId,
      invoice_payment_id: null,
      debt_id: null,
      debt_negotiation_id: null,
      type: data.type,
      status: 'PENDENTE',
      description: `${data.description} (${i + 1}/${data.total_installments})`,
      amount: installmentAmount,
      paid_amount: null,
      due_date: dueDate.toISOString().split('T')[0],
      payment_date: null,
      installment_number: i + 1,
      total_installments: data.total_installments,
      notes: data.notes || null,
    });
  }

  const { data: created, error } = await client
    .from(TABLE)
    .insert(transactions)
    .select();

  if (error) {
    throw new Error(`Erro ao criar parcelas: ${error.message}`);
  }

  // Se for despesa no cartao, diminuir limite disponivel com valor total
  if (data.type === 'DESPESA' && data.credit_card_id) {
    await updateCreditCardAvailableLimit(
      data.credit_card_id,
      userId,
      -data.total_amount,
      accessToken
    );
  }

  return created || [];
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: UpdateTransactionDTO,
  accessToken: string
): Promise<FinanceTransaction> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar transacao: ${error.message}`);
  }

  if (!data) {
    throw new Error('Transacao nao encontrada');
  }

  return data;
}

export async function payTransaction(
  transactionId: string,
  userId: string,
  payment: PayTransactionDTO,
  accessToken: string
): Promise<FinanceTransaction> {
  const client = createUserClient(accessToken);

  // 1. Buscar transacao existente
  const existing = await getTransactionById(transactionId, userId, accessToken);
  if (!existing) {
    throw new Error('Transacao nao encontrada');
  }

  // 2. Bloquear pagamento de transacao de cartao (deve ser pago via fatura)
  if (existing.credit_card_id) {
    throw new Error('Transacoes de cartao so podem ser pagas via fatura');
  }

  const paidAmount = payment.paid_amount || existing.amount;
  const paymentDate = payment.payment_date || new Date().toISOString().split('T')[0];

  // 3. Atualizar status da transacao
  const { data, error } = await client
    .from(TABLE)
    .update({
      status: 'PAGO',
      paid_amount: paidAmount,
      payment_date: paymentDate,
    })
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao pagar transacao: ${error.message}`);
  }

  if (!data) {
    throw new Error('Transacao nao encontrada');
  }

  // 4. Atualizar saldo da conta
  if (existing.account_id) {
    const account = await getAccountById(existing.account_id, userId, accessToken);
    if (account) {
      const currentBalance = account.current_balance;
      const newBalance =
        existing.type === 'RECEITA'
          ? currentBalance + paidAmount
          : currentBalance - paidAmount;
      await updateAccountBalance(existing.account_id, userId, newBalance, accessToken);
    }
  }

  return data;
}

export async function cancelTransaction(
  transactionId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ status: 'CANCELADO' })
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao cancelar transacao: ${error.message}`);
  }
}

export async function cancelInstallmentGroup(
  installmentGroupId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ status: 'CANCELADO' })
    .eq('installment_group_id', installmentGroupId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao cancelar parcelas: ${error.message}`);
  }
}

export async function getTransactionsByCreditCardAndPeriod(
  creditCardId: string,
  userId: string,
  startDate: string,
  endDate: string,
  accessToken: string
): Promise<TransactionWithCategory[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select(`
      *,
      category:finance_categories(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('credit_card_id', creditCardId)
    .eq('user_id', userId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .neq('status', 'CANCELADO')
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar fatura: ${error.message}`);
  }

  return data || [];
}

export async function getUpcomingTransactions(
  userId: string,
  days: number,
  accessToken: string
): Promise<TransactionWithCategory[]> {
  const client = createUserClient(accessToken);

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const { data, error } = await client
    .from(TABLE)
    .select(`
      *,
      category:finance_categories(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'PENDENTE')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar proximos vencimentos: ${error.message}`);
  }

  return data || [];
}
