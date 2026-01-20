import { supabaseAdmin } from '../../lib/supabase.js';
import type { Bank } from '../../domain/finance-types.js';

const TABLE = 'banks';

export async function getAllBanks(): Promise<Bank[]> {
  const client = supabaseAdmin;

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar bancos: ${error.message}`);
  }

  return data || [];
}

export async function searchBanks(query: string): Promise<Bank[]> {
  const client = supabaseAdmin;

  // Busca por nome ou codigo
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,full_name.ilike.%${query}%,code.eq.${parseInt(query) || 0}`)
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Erro ao buscar bancos: ${error.message}`);
  }

  return data || [];
}

export async function getBankById(bankId: string): Promise<Bank | null> {
  const client = supabaseAdmin;

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', bankId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Erro ao buscar banco: ${error.message}`);
  }

  return data;
}

export async function getBankByCode(code: number): Promise<Bank | null> {
  const client = supabaseAdmin;

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Erro ao buscar banco: ${error.message}`);
  }

  return data;
}

export async function getPopularBanks(): Promise<Bank[]> {
  const client = supabaseAdmin;

  // Lista dos bancos mais populares por codigo
  const popularCodes = [1, 33, 104, 237, 260, 341, 77, 336, 380, 212, 756, 748];

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .in('code', popularCodes)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar bancos populares: ${error.message}`);
  }

  return data || [];
}

export async function getBenefitProviders(): Promise<Bank[]> {
  const client = supabaseAdmin;

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .eq('is_benefit_provider', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar empresas de beneficios: ${error.message}`);
  }

  return data || [];
}
