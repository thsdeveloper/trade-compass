import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceAccount,
  CreateAccountDTO,
  UpdateAccountDTO,
} from '../../domain/finance-types.js';

const TABLE = 'finance_accounts';

export async function getAccountsByUser(
  userId: string,
  accessToken: string
): Promise<FinanceAccount[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
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
): Promise<FinanceAccount> {
  const client = createUserClient(accessToken);

  const initialBalance = account.initial_balance || 0;

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: account.name,
      type: account.type,
      initial_balance: initialBalance,
      current_balance: initialBalance,
      color: account.color || '#10b981',
      icon: account.icon || 'Wallet',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar conta: ${error.message}`);
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

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar conta: ${error.message}`);
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

export async function deleteAccount(
  accountId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Soft delete - apenas desativa
  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover conta: ${error.message}`);
  }
}
