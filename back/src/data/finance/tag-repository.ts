import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceTag,
  CreateTagDTO,
  UpdateTagDTO,
} from '../../domain/finance-types.js';

const TABLE = 'finance_tags';
const JUNCTION_TABLE = 'finance_transaction_tags';

export async function getTagsByUser(
  userId: string,
  accessToken: string
): Promise<FinanceTag[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar tags: ${error.message}`);
  }

  return data || [];
}

export async function getTagById(
  tagId: string,
  userId: string,
  accessToken: string
): Promise<FinanceTag | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', tagId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar tag: ${error.message}`);
  }

  return data;
}

export async function createTag(
  userId: string,
  tag: CreateTagDTO,
  accessToken: string
): Promise<FinanceTag> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: tag.name.trim(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Tag com este nome ja existe');
    }
    throw new Error(`Erro ao criar tag: ${error.message}`);
  }

  return data;
}

export async function updateTag(
  tagId: string,
  userId: string,
  updates: UpdateTagDTO,
  accessToken: string
): Promise<FinanceTag> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', tagId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar tag: ${error.message}`);
  }

  if (!data) {
    throw new Error('Tag nao encontrada');
  }

  return data;
}

export async function deleteTag(
  tagId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', tagId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover tag: ${error.message}`);
  }
}

export async function getTagsForTransaction(
  transactionId: string,
  accessToken: string
): Promise<FinanceTag[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(JUNCTION_TABLE)
    .select(`
      tag:finance_tags(*)
    `)
    .eq('transaction_id', transactionId);

  if (error) {
    throw new Error(`Erro ao buscar tags da transacao: ${error.message}`);
  }

  return (data || [])
    .map(item => {
      const tagData = item.tag;
      return Array.isArray(tagData) ? tagData[0] : tagData;
    })
    .filter((tag): tag is FinanceTag => tag !== null && tag !== undefined && tag.is_active);
}

export async function setTransactionTags(
  transactionId: string,
  tagIds: string[],
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Remove tags existentes
  const { error: deleteError } = await client
    .from(JUNCTION_TABLE)
    .delete()
    .eq('transaction_id', transactionId);

  if (deleteError) {
    throw new Error(`Erro ao limpar tags: ${deleteError.message}`);
  }

  // Adiciona novas tags se houver
  if (tagIds.length > 0) {
    const insertData = tagIds.map(tagId => ({
      transaction_id: transactionId,
      tag_id: tagId,
    }));

    const { error: insertError } = await client
      .from(JUNCTION_TABLE)
      .insert(insertData);

    if (insertError) {
      throw new Error(`Erro ao adicionar tags: ${insertError.message}`);
    }
  }
}

export async function addTagToTransaction(
  transactionId: string,
  tagId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(JUNCTION_TABLE)
    .insert({
      transaction_id: transactionId,
      tag_id: tagId,
    });

  if (error) {
    if (error.code === '23505') return; // Ja existe, ignora
    throw new Error(`Erro ao adicionar tag: ${error.message}`);
  }
}

export async function removeTagFromTransaction(
  transactionId: string,
  tagId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(JUNCTION_TABLE)
    .delete()
    .eq('transaction_id', transactionId)
    .eq('tag_id', tagId);

  if (error) {
    throw new Error(`Erro ao remover tag: ${error.message}`);
  }
}

export async function getTransactionIdsByTag(
  tagId: string,
  accessToken: string
): Promise<string[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(JUNCTION_TABLE)
    .select('transaction_id')
    .eq('tag_id', tagId);

  if (error) {
    throw new Error(`Erro ao buscar transacoes por tag: ${error.message}`);
  }

  return (data || []).map(item => item.transaction_id);
}
