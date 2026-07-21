import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceAccount,
  CreateAccountDTO,
  UpdateAccountDTO,
  AccountWithBank,
  AccountUsage,
} from '../../domain/finance-types.js';

const TABLE = 'finance_accounts';

// Preserva o codigo de erro do Postgres/PostgREST ao relancar, para as rotas
// mapearem 23505 (nome duplicado), 23503 (FK), 42501 (RLS) etc. em HTTP correto.
function withPostgresCode(err: Error, code?: string): Error & { code?: string } {
  const typed = err as Error & { code?: string };
  typed.code = code;
  return typed;
}

export async function getAccountsByUser(
  userId: string,
  accessToken: string
): Promise<AccountWithBank[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select(`
      *,
      bank:banks(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar contas: ${error.message}`);
  }

  return data || [];
}

export async function getAccountById(
  accountId: string,
  userId: string,
  accessToken: string
): Promise<FinanceAccount | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar conta: ${error.message}`);
  }

  return data;
}

export async function createAccount(
  userId: string,
  account: CreateAccountDTO,
  accessToken: string
): Promise<AccountWithBank> {
  const client = createUserClient(accessToken);

  const initialBalance = account.initial_balance || 0;

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: account.name,
      type: account.type,
      bank_id: account.bank_id,
      initial_balance: initialBalance,
      current_balance: initialBalance,
      color: account.color || '#10b981',
      icon: account.icon || 'Wallet',
    })
    .select('*, bank:banks(*)')
    .single();

  if (error) {
    throw withPostgresCode(new Error(`Erro ao criar conta: ${error.message}`), error.code);
  }

  return data;
}

export async function updateAccount(
  accountId: string,
  userId: string,
  updates: UpdateAccountDTO,
  accessToken: string
): Promise<FinanceAccount> {
  const client = createUserClient(accessToken);

  // Se initial_balance está sendo atualizado, precisa ajustar current_balance também
  if (updates.initial_balance !== undefined) {
    // Buscar conta atual para calcular a diferença
    const { data: currentAccount, error: fetchError } = await client
      .from(TABLE)
      .select('initial_balance, current_balance')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      // PGRST116 = nenhuma linha: a conta nao existe ou nao e do usuario.
      if (fetchError.code === 'PGRST116') {
        throw new Error('Conta nao encontrada');
      }
      throw withPostgresCode(
        new Error(`Erro ao buscar conta: ${fetchError.message}`),
        fetchError.code
      );
    }

    if (currentAccount) {
      const diff = updates.initial_balance - currentAccount.initial_balance;
      (updates as UpdateAccountDTO & { current_balance: number }).current_balance =
        currentAccount.current_balance + diff;
    }
  }

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    // .single() com zero linhas devolve PGRST116, nao data: null — sem este
    // ramo a rota responderia 500 em vez de 404.
    if (error.code === 'PGRST116') {
      throw new Error('Conta nao encontrada');
    }
    throw withPostgresCode(new Error(`Erro ao atualizar conta: ${error.message}`), error.code);
  }

  if (!data) {
    throw new Error('Conta nao encontrada');
  }

  return data;
}

export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalance: number,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ current_balance: newBalance })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao atualizar saldo: ${error.message}`);
  }
}

// Conta os registros que ainda dependem da conta. Unica fonte da verdade da regra
// de exclusao: o DELETE e a rota /usage consomem os mesmos filtros daqui.
export async function getAccountUsage(
  accountId: string,
  userId: string,
  accessToken: string
): Promise<AccountUsage> {
  const client = createUserClient(accessToken);

  const [transactionsResult, recurrencesResult, invoicePaymentsResult, goalsResult] =
    await Promise.all([
      client
        .from('finance_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .neq('status', 'CANCELADO'),
      client
        .from('finance_recurrences')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .eq('is_active', true),
      client
        .from('finance_invoice_payments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('user_id', userId),
      // Metas em estado terminal (CONCLUIDO/CANCELADO) sao historico e nao bloqueiam,
      // no mesmo espirito das recorrencias inativas e das transacoes canceladas.
      client
        .from('finance_goals')
        .select('id', { count: 'exact', head: true })
        .eq('linked_account_id', accountId)
        .eq('user_id', userId)
        .in('status', ['ATIVO', 'PAUSADO']),
    ]);

  // O PostgREST nao rejeita a promessa quando a consulta falha: devolve
  // { count: null, error }. Sem esta checagem um erro viraria "zero vinculos" e
  // liberaria a exclusao — a regra tem que falhar FECHADA, nunca aberta.
  for (const result of [
    transactionsResult,
    recurrencesResult,
    invoicePaymentsResult,
    goalsResult,
  ]) {
    if (result.error) {
      throw withPostgresCode(
        new Error(`Erro ao verificar vinculos da conta: ${result.error.message}`),
        result.error.code
      );
    }
  }

  const transactions = transactionsResult.count ?? 0;
  const recurrences = recurrencesResult.count ?? 0;
  const invoice_payments = invoicePaymentsResult.count ?? 0;
  const goals = goalsResult.count ?? 0;

  return {
    transactions,
    recurrences,
    invoice_payments,
    goals,
    can_delete: transactions === 0 && recurrences === 0 && invoice_payments === 0 && goals === 0,
  };
}

export async function deleteAccount(
  accountId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Verificar se existem registros vinculados antes de excluir
  const usage = await getAccountUsage(accountId, userId, accessToken);

  if (!usage.can_delete) {
    const parts: string[] = [];
    if (usage.transactions > 0) {
      parts.push(`${usage.transactions} transacao(oes)`);
    }
    if (usage.recurrences > 0) {
      parts.push(`${usage.recurrences} recorrencia(s)`);
    }
    if (usage.invoice_payments > 0) {
      parts.push(`${usage.invoice_payments} pagamento(s) de fatura`);
    }
    if (usage.goals > 0) {
      parts.push(`${usage.goals} meta(s) vinculada(s)`);
    }
    throw new Error(
      `Nao e possivel remover esta conta pois ela possui registros vinculados: ${parts.join(', ')}. Remova ou transfira esses registros antes de excluir a conta.`
    );
  }

  // Soft delete - apenas desativa
  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    throw withPostgresCode(new Error(`Erro ao remover conta: ${error.message}`), error.code);
  }
}
