import { createUserClient } from '../lib/supabase.js';
import type {
  WatchlistItem,
  CreateWatchlistItemDTO,
  UpdateWatchlistItemDTO,
} from '../domain/types.js';

const TABLE = 'watchlist_items';

export async function getWatchlistByUser(
  userId: string,
  accessToken: string
): Promise<WatchlistItem[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar watchlist: ${error.message}`);
  }

  return data || [];
}

export async function addToWatchlist(
  userId: string,
  item: CreateWatchlistItemDTO,
  accessToken: string
): Promise<WatchlistItem> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      ticker: item.ticker.toUpperCase(),
      notes: item.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ativo ja existe na watchlist');
    }
    throw new Error(`Erro ao adicionar item: ${error.message}`);
  }

  return data;
}

export async function updateWatchlistItem(
  itemId: string,
  userId: string,
  updates: UpdateWatchlistItemDTO,
  accessToken: string
): Promise<WatchlistItem> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update({ notes: updates.notes })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar item: ${error.message}`);
  }

  if (!data) {
    throw new Error('Item nao encontrado');
  }

  return data;
}

export async function removeFromWatchlist(
  itemId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(TABLE)
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover item: ${error.message}`);
  }
}
