import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceTransaction,
  CreateTransactionDTO,
  CreateInstallmentTransactionDTO,
  UpdateTransactionDTO,
  PayTransactionDTO,
  TransactionFilters,
  TransactionWithCategory,
  CreateTransferDTO,
  TransferResult,
  FinanceAccount,
} from '../../domain/finance-types.js';
import { updateAccountBalance, getAccountById } from './account-repository.js';
import { updateCreditCardAvailableLimit } from './credit-card-repository.js';
import { setTransactionTags, getTagsForTransaction, getTransactionIdsByTag } from './tag-repository.js';

const TABLE = 'finance_transactions';

// Helper para enriquecer transacoes com tags
async function enrichTransactionsWithTags(
  transactions: TransactionWithCategory[],
  accessToken: string
): Promise<TransactionWithCategory[]> {
  if (transactions.length === 0) return transactions;

  const enriched = await Promise.all(
    transactions.map(async (tx) => {
      const tags = await getTagsForTransaction(tx.id, accessToken);
      return { ...tx, tags };
    })
  );

  return enriched;
}

export async function getTransactionsByUser(
  userId: string,
  filters: TransactionFilters,
  accessToken: string
): Promise<TransactionWithCategory[]> {
  const client = createUserClient(accessToken);

  // Se filtro por tag, buscar IDs das transacoes primeiro
  let transactionIdsWithTag: string[] | null = null;
  if (filters.tag_id) {
    transactionIdsWithTag = await getTransactionIdsByTag(filters.tag_id, accessToken);
    // Se nao houver transacoes com essa tag, retornar vazio
    if (transactionIdsWithTag.length === 0) {
      return [];
    }
  }

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

  // Aplicar filtro de tag (IDs das transacoes)
  if (transactionIdsWithTag) {
    query = query.in('id', transactionIdsWithTag);
  }

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

  if (filters.search && filters.search.trim().length >= 2) {
    query = query.ilike('description', `%${filters.search.trim()}%`);
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

  return enrichTransactionsWithTags(data || [], accessToken);
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

  if (!data) return null;

  // Enriquecer com tags
  const tags = await getTagsForTransaction(data.id, accessToken);
  return { ...data, tags };
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
      goal_id: transaction.goal_id || null,
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

  // Associar tags a transacao
  if (transaction.tag_ids && transaction.tag_ids.length > 0) {
    await setTransactionTags(data.id, transaction.tag_ids, accessToken);
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
      transfer_id: null,
      goal_id: null,
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

  // Associar tags a todas as parcelas
  if (data.tag_ids && data.tag_ids.length > 0 && created) {
    await Promise.all(
      created.map(tx => setTransactionTags(tx.id, data.tag_ids!, accessToken))
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

  // Extrair tag_ids antes de enviar para o banco
  const { tag_ids, ...dbUpdates } = updates;

  const { data, error } = await client
    .from(TABLE)
    .update(dbUpdates)
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

  // Atualizar tags se fornecidas
  if (tag_ids !== undefined) {
    await setTransactionTags(transactionId, tag_ids, accessToken);
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
  // Usar conta fornecida ou manter a original
  const finalAccountId = payment.account_id || existing.account_id;

  // 3. Se trocou a conta, validar que a nova conta existe
  if (payment.account_id && payment.account_id !== existing.account_id) {
    const newAccount = await getAccountById(payment.account_id, userId, accessToken);
    if (!newAccount) {
      throw new Error('Conta nao encontrada');
    }
  }

  // 4. Atualizar status da transacao (e account_id se mudou)
  const updateData: Record<string, unknown> = {
    status: 'PAGO',
    paid_amount: paidAmount,
    payment_date: paymentDate,
  };

  if (payment.account_id) {
    updateData.account_id = payment.account_id;
  }

  const { data, error } = await client
    .from(TABLE)
    .update(updateData)
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

  // 5. Atualizar saldo da conta (usa a conta final, seja nova ou original)
  if (finalAccountId) {
    const account = await getAccountById(finalAccountId, userId, accessToken);
    if (account) {
      const currentBalance = account.current_balance;
      const newBalance =
        existing.type === 'RECEITA'
          ? currentBalance + paidAmount
          : currentBalance - paidAmount;
      await updateAccountBalance(finalAccountId, userId, newBalance, accessToken);
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

// Cancela transacoes de uma recorrencia a partir de uma data
// Nota: transacoes ja pagas (PAGO) nao sao canceladas
export async function cancelRecurrenceTransactionsFromDate(
  recurrenceId: string,
  userId: string,
  fromDate: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ status: 'CANCELADO' })
    .eq('recurrence_id', recurrenceId)
    .eq('user_id', userId)
    .gte('due_date', fromDate)
    .neq('status', 'CANCELADO')
    .neq('status', 'PAGO');

  if (error) {
    throw new Error(`Erro ao cancelar transacoes da recorrencia: ${error.message}`);
  }
}

// Cancela todas as transacoes de uma recorrencia
// Nota: transacoes ja pagas (PAGO) nao sao canceladas
export async function cancelAllRecurrenceTransactions(
  recurrenceId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ status: 'CANCELADO' })
    .eq('recurrence_id', recurrenceId)
    .eq('user_id', userId)
    .neq('status', 'CANCELADO')
    .neq('status', 'PAGO');

  if (error) {
    throw new Error(`Erro ao cancelar transacoes da recorrencia: ${error.message}`);
  }
}

// Filtra campos editaveis baseado no status da transacao
function filterEditableFields(
  updates: UpdateTransactionDTO,
  status: string
): Partial<UpdateTransactionDTO> {
  // Extrair tag_ids pois nao vai direto para o banco
  const { tag_ids, ...dbUpdates } = updates;

  if (status === 'PAGO') {
    // Transacoes pagas so podem ter categoria, descricao e notas editados
    return removeUndefinedFields({
      category_id: dbUpdates.category_id,
      description: dbUpdates.description,
      notes: dbUpdates.notes,
    });
  }

  return removeUndefinedFields(dbUpdates);
}

// Filtra campos editaveis para edicao em lote (nao permite due_date e description)
function filterBatchEditableFields(
  updates: UpdateTransactionDTO
): Partial<UpdateTransactionDTO> {
  // Extrair tag_ids e campos que nao podem ser editados em lote
  const { tag_ids, due_date, description, ...dbUpdates } = updates;

  return removeUndefinedFields(dbUpdates);
}

// Remove campos undefined do objeto para evitar sobrescrever com null
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Atualiza transacoes de uma recorrencia com opcoes de escopo
export async function updateRecurrenceTransactions(
  transactionId: string,
  userId: string,
  recurrenceId: string,
  dueDate: string,
  currentStatus: string,
  updates: UpdateTransactionDTO,
  option: 'only_this' | 'this_and_future' | 'all',
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Filtrar campos editaveis baseado no status da transacao atual
  const safeUpdates = filterEditableFields(updates, currentStatus);
  const { tag_ids } = updates;

  switch (option) {
    case 'only_this': {
      // Atualizar apenas esta transacao
      if (Object.keys(safeUpdates).length > 0) {
        const { error } = await client
          .from(TABLE)
          .update(safeUpdates)
          .eq('id', transactionId)
          .eq('user_id', userId);

        if (error) {
          throw new Error(`Erro ao atualizar transacao: ${error.message}`);
        }
      }

      // Atualizar tags se fornecidas
      if (tag_ids !== undefined) {
        await setTransactionTags(transactionId, tag_ids, accessToken);
      }
      break;
    }

    case 'this_and_future': {
      // Para editar em lote, nao permitir due_date e description (cada transacao tem sua propria)
      const batchUpdates = filterBatchEditableFields(updates);

      if (Object.keys(batchUpdates).length > 0) {
        // Atualizar esta e futuras PENDENTES
        const { error } = await client
          .from(TABLE)
          .update(batchUpdates)
          .eq('recurrence_id', recurrenceId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE')
          .gte('due_date', dueDate);

        if (error) {
          throw new Error(`Erro ao atualizar transacoes: ${error.message}`);
        }
      }

      // Atualizar tags em todas as afetadas
      if (tag_ids !== undefined) {
        const { data: affectedTransactions } = await client
          .from(TABLE)
          .select('id')
          .eq('recurrence_id', recurrenceId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE')
          .gte('due_date', dueDate);

        if (affectedTransactions) {
          await Promise.all(
            affectedTransactions.map((tx) =>
              setTransactionTags(tx.id, tag_ids, accessToken)
            )
          );
        }
      }
      break;
    }

    case 'all': {
      // Para editar em lote, nao permitir due_date e description (cada transacao tem sua propria)
      const batchUpdates = filterBatchEditableFields(updates);

      if (Object.keys(batchUpdates).length > 0) {
        // Atualizar todas PENDENTES da recorrencia
        const { error } = await client
          .from(TABLE)
          .update(batchUpdates)
          .eq('recurrence_id', recurrenceId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE');

        if (error) {
          throw new Error(`Erro ao atualizar transacoes: ${error.message}`);
        }
      }

      // Atualizar tags em todas as afetadas
      if (tag_ids !== undefined) {
        const { data: affectedTransactions } = await client
          .from(TABLE)
          .select('id')
          .eq('recurrence_id', recurrenceId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE');

        if (affectedTransactions) {
          await Promise.all(
            affectedTransactions.map((tx) =>
              setTransactionTags(tx.id, tag_ids, accessToken)
            )
          );
        }
      }
      break;
    }

    default:
      throw new Error('Opcao invalida');
  }
}

// Atualiza transacoes de um parcelamento com opcoes de escopo
export async function updateInstallmentTransactions(
  transactionId: string,
  userId: string,
  installmentGroupId: string,
  dueDate: string,
  currentStatus: string,
  updates: UpdateTransactionDTO,
  option: 'only_this' | 'this_and_future' | 'all',
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Filtrar campos editaveis baseado no status da transacao atual
  const safeUpdates = filterEditableFields(updates, currentStatus);
  const { tag_ids } = updates;

  switch (option) {
    case 'only_this': {
      // Atualizar apenas esta parcela
      if (Object.keys(safeUpdates).length > 0) {
        const { error } = await client
          .from(TABLE)
          .update(safeUpdates)
          .eq('id', transactionId)
          .eq('user_id', userId);

        if (error) {
          throw new Error(`Erro ao atualizar parcela: ${error.message}`);
        }
      }

      // Atualizar tags se fornecidas
      if (tag_ids !== undefined) {
        await setTransactionTags(transactionId, tag_ids, accessToken);
      }
      break;
    }

    case 'this_and_future': {
      // Para editar em lote, nao permitir due_date e description (cada parcela tem sua propria)
      const batchUpdates = filterBatchEditableFields(updates);

      if (Object.keys(batchUpdates).length > 0) {
        // Atualizar esta e futuras PENDENTES
        const { error } = await client
          .from(TABLE)
          .update(batchUpdates)
          .eq('installment_group_id', installmentGroupId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE')
          .gte('due_date', dueDate);

        if (error) {
          throw new Error(`Erro ao atualizar parcelas: ${error.message}`);
        }
      }

      // Atualizar tags em todas as afetadas
      if (tag_ids !== undefined) {
        const { data: affectedTransactions } = await client
          .from(TABLE)
          .select('id')
          .eq('installment_group_id', installmentGroupId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE')
          .gte('due_date', dueDate);

        if (affectedTransactions) {
          await Promise.all(
            affectedTransactions.map((tx) =>
              setTransactionTags(tx.id, tag_ids, accessToken)
            )
          );
        }
      }
      break;
    }

    case 'all': {
      // Para editar em lote, nao permitir due_date e description (cada parcela tem sua propria)
      const batchUpdates = filterBatchEditableFields(updates);

      if (Object.keys(batchUpdates).length > 0) {
        // Atualizar todas PENDENTES do parcelamento
        const { error } = await client
          .from(TABLE)
          .update(batchUpdates)
          .eq('installment_group_id', installmentGroupId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE');

        if (error) {
          throw new Error(`Erro ao atualizar parcelas: ${error.message}`);
        }
      }

      // Atualizar tags em todas as afetadas
      if (tag_ids !== undefined) {
        const { data: affectedTransactions } = await client
          .from(TABLE)
          .select('id')
          .eq('installment_group_id', installmentGroupId)
          .eq('user_id', userId)
          .eq('status', 'PENDENTE');

        if (affectedTransactions) {
          await Promise.all(
            affectedTransactions.map((tx) =>
              setTransactionTags(tx.id, tag_ids, accessToken)
            )
          );
        }
      }
      break;
    }

    default:
      throw new Error('Opcao invalida');
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

// ==================== TRANSFERENCIAS ====================

export async function createTransfer(
  userId: string,
  transfer: CreateTransferDTO,
  accessToken: string
): Promise<TransferResult> {
  const client = createUserClient(accessToken);

  // Gerar UUID compartilhado para vincular as transacoes
  const transferId = crypto.randomUUID();
  const transferDate = transfer.transfer_date || new Date().toISOString().split('T')[0];

  // 1. Validar que origem e destino sao diferentes
  if (transfer.source_account_id === transfer.destination_account_id) {
    throw new Error('Conta de origem e destino devem ser diferentes');
  }

  // 2. Buscar ambas contas para validar existencia e obter saldos
  const [sourceAccount, destAccount] = await Promise.all([
    getAccountById(transfer.source_account_id, userId, accessToken),
    getAccountById(transfer.destination_account_id, userId, accessToken),
  ]);

  if (!sourceAccount) {
    throw new Error('Conta de origem nao encontrada');
  }
  if (!destAccount) {
    throw new Error('Conta de destino nao encontrada');
  }

  // 3. Criar transacao de saida (DESPESA na conta origem)
  const sourceTransactionData = {
    user_id: userId,
    account_id: transfer.source_account_id,
    category_id: transfer.category_id,
    credit_card_id: null,
    recurrence_id: null,
    installment_group_id: null,
    invoice_payment_id: null,
    debt_id: null,
    debt_negotiation_id: null,
    transfer_id: transferId,
    type: 'DESPESA' as const,
    status: 'PAGO' as const,
    description: transfer.description,
    amount: transfer.amount,
    paid_amount: transfer.amount,
    due_date: transferDate,
    payment_date: transferDate,
    notes: transfer.notes || null,
  };

  // 4. Criar transacao de entrada (RECEITA na conta destino)
  const destTransactionData = {
    user_id: userId,
    account_id: transfer.destination_account_id,
    category_id: transfer.category_id,
    credit_card_id: null,
    recurrence_id: null,
    installment_group_id: null,
    invoice_payment_id: null,
    debt_id: null,
    debt_negotiation_id: null,
    transfer_id: transferId,
    goal_id: transfer.goal_id || null, // Vincular a objetivo se especificado
    type: 'RECEITA' as const,
    status: 'PAGO' as const,
    description: transfer.description,
    amount: transfer.amount,
    paid_amount: transfer.amount,
    due_date: transferDate,
    payment_date: transferDate,
    notes: transfer.notes || null,
  };

  // 5. Inserir ambas transacoes
  const { data: insertedTransactions, error: insertError } = await client
    .from(TABLE)
    .insert([sourceTransactionData, destTransactionData])
    .select();

  if (insertError) {
    throw new Error(`Erro ao criar transferencia: ${insertError.message}`);
  }

  if (!insertedTransactions || insertedTransactions.length !== 2) {
    throw new Error('Erro ao criar transacoes da transferencia');
  }

  // 6. Atualizar saldos das contas
  const newSourceBalance = sourceAccount.current_balance - transfer.amount;
  const newDestBalance = destAccount.current_balance + transfer.amount;

  await Promise.all([
    updateAccountBalance(transfer.source_account_id, userId, newSourceBalance, accessToken),
    updateAccountBalance(transfer.destination_account_id, userId, newDestBalance, accessToken),
  ]);

  // Identificar qual transacao e qual
  const sourceTx = insertedTransactions.find(t => t.type === 'DESPESA')!;
  const destTx = insertedTransactions.find(t => t.type === 'RECEITA')!;

  return {
    transfer_id: transferId,
    source_transaction: sourceTx,
    destination_transaction: destTx,
  };
}

export async function cancelTransfer(
  transferId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // 1. Buscar ambas transacoes
  const { data: transactions, error: fetchError } = await client
    .from(TABLE)
    .select('*, account:finance_accounts(*)')
    .eq('transfer_id', transferId)
    .eq('user_id', userId);

  if (fetchError) {
    throw new Error(`Erro ao buscar transferencia: ${fetchError.message}`);
  }

  if (!transactions || transactions.length !== 2) {
    throw new Error('Transferencia nao encontrada ou incompleta');
  }

  // 2. Verificar se ja esta cancelada
  if (transactions.every(t => t.status === 'CANCELADO')) {
    throw new Error('Transferencia ja esta cancelada');
  }

  // 3. Reverter os saldos das contas
  for (const tx of transactions) {
    if (tx.status === 'PAGO' && tx.account) {
      const account = tx.account as FinanceAccount;
      const currentBalance = account.current_balance;
      // Se DESPESA, adicionar de volta; se RECEITA, subtrair
      const adjustment = tx.type === 'DESPESA' ? tx.amount : -tx.amount;
      await updateAccountBalance(tx.account_id, userId, currentBalance + adjustment, accessToken);
    }
  }

  // 4. Cancelar ambas transacoes
  const { error: cancelError } = await client
    .from(TABLE)
    .update({ status: 'CANCELADO' })
    .eq('transfer_id', transferId)
    .eq('user_id', userId);

  if (cancelError) {
    throw new Error(`Erro ao cancelar transferencia: ${cancelError.message}`);
  }
}

export async function getTransferCounterpartAccount(
  transferId: string,
  currentTransactionId: string,
  userId: string,
  accessToken: string
): Promise<FinanceAccount | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('account:finance_accounts(*)')
    .eq('transfer_id', transferId)
    .eq('user_id', userId)
    .neq('id', currentTransactionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar contraparte da transferencia: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = data?.account as any;
  return account || null;
}
