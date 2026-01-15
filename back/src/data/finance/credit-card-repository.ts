import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceCreditCard,
  CreateCreditCardDTO,
  UpdateCreditCardDTO,
} from '../../domain/finance-types.js';

const TABLE = 'finance_credit_cards';

export async function getCreditCardsByUser(
  userId: string,
  accessToken: string
): Promise<FinanceCreditCard[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar cartoes: ${error.message}`);
  }

  return data || [];
}

export async function getCreditCardById(
  cardId: string,
  userId: string,
  accessToken: string
): Promise<FinanceCreditCard | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar cartao: ${error.message}`);
  }

  return data;
}

export async function createCreditCard(
  userId: string,
  card: CreateCreditCardDTO,
  accessToken: string
): Promise<FinanceCreditCard> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: card.name,
      brand: card.brand,
      total_limit: card.total_limit,
      available_limit: card.total_limit,
      closing_day: card.closing_day,
      due_day: card.due_day,
      color: card.color || '#8b5cf6',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar cartao: ${error.message}`);
  }

  return data;
}

export async function updateCreditCard(
  cardId: string,
  userId: string,
  updates: UpdateCreditCardDTO,
  accessToken: string
): Promise<FinanceCreditCard> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar cartao: ${error.message}`);
  }

  if (!data) {
    throw new Error('Cartao nao encontrado');
  }

  return data;
}

export async function updateCreditCardLimit(
  cardId: string,
  userId: string,
  availableLimit: number,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ available_limit: availableLimit })
    .eq('id', cardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao atualizar limite: ${error.message}`);
  }
}

export async function updateCreditCardAvailableLimit(
  cardId: string,
  userId: string,
  delta: number,
  accessToken: string
): Promise<FinanceCreditCard> {
  const client = createUserClient(accessToken);

  const card = await getCreditCardById(cardId, userId, accessToken);
  if (!card) {
    throw new Error('Cartao nao encontrado');
  }

  const newLimit = card.available_limit + delta;

  const { data, error } = await client
    .from(TABLE)
    .update({ available_limit: newLimit })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar limite disponivel: ${error.message}`);
  }

  return data;
}

export async function deleteCreditCard(
  cardId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Soft delete - apenas desativa
  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', cardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover cartao: ${error.message}`);
  }
}
