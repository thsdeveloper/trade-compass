/**
 * Serviço para buscar taxas TR do Banco Central do Brasil
 * API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados
 * Série 226 = Taxa Referencial (TR)
 */

import type { TRRate } from '../domain/finance-types.js';
import { supabaseAdmin } from '../lib/supabase.js';

const BCB_API_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados';
const TR_RATES_TABLE = 'finance_tr_rates';

interface BCBTRResponse {
  data: string; // DD/MM/YYYY
  valor: string; // Taxa como string
}

/**
 * Busca taxas TR da API do Banco Central
 */
export async function fetchTRRatesFromBCB(
  startDate?: string,
  endDate?: string
): Promise<{ date: string; rate: number }[]> {
  const params = new URLSearchParams({ formato: 'json' });

  if (startDate) {
    // Converter YYYY-MM-DD para DD/MM/YYYY
    const [year, month, day] = startDate.split('-');
    params.set('dataInicial', `${day}/${month}/${year}`);
  }

  if (endDate) {
    const [year, month, day] = endDate.split('-');
    params.set('dataFinal', `${day}/${month}/${year}`);
  }

  const url = `${BCB_API_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar TR do BCB: ${response.status}`);
    }

    const data: BCBTRResponse[] = await response.json();

    return data.map((item) => {
      // Converter DD/MM/YYYY para YYYY-MM-DD
      const [day, month, year] = item.data.split('/');
      return {
        date: `${year}-${month}-${day}`,
        rate: parseFloat(item.valor),
      };
    });
  } catch (error) {
    console.error('Erro ao buscar TR do BCB:', error);
    throw error;
  }
}

/**
 * Sincroniza taxas TR do Banco Central com o banco de dados
 */
export async function syncTRRates(startDate?: string, endDate?: string): Promise<number> {
  const client = supabaseAdmin;

  // Buscar taxas do BCB
  const rates = await fetchTRRatesFromBCB(startDate, endDate);

  if (rates.length === 0) {
    return 0;
  }

  // Inserir no banco de dados (upsert)
  const { error } = await client.from(TR_RATES_TABLE).upsert(
    rates.map((r) => ({
      reference_date: r.date,
      rate: r.rate,
    })),
    { onConflict: 'reference_date' }
  );

  if (error) {
    throw new Error(`Erro ao salvar taxas TR: ${error.message}`);
  }

  return rates.length;
}

/**
 * Busca taxa TR do banco de dados para uma data específica
 */
export async function getTRRate(date: string, accessToken: string): Promise<TRRate | null> {
  const { createUserClient } = await import('../lib/supabase.js');
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TR_RATES_TABLE)
    .select('*')
    .eq('reference_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar taxa TR: ${error.message}`);
  }

  return data;
}

/**
 * Busca taxa TR mais próxima de uma data
 */
export async function getClosestTRRate(date: string, accessToken: string): Promise<TRRate | null> {
  const { createUserClient } = await import('../lib/supabase.js');
  const client = createUserClient(accessToken);

  // Buscar taxa mais próxima anterior ou igual
  const { data, error } = await client
    .from(TR_RATES_TABLE)
    .select('*')
    .lte('reference_date', date)
    .order('reference_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar taxa TR: ${error.message}`);
  }

  return data;
}

/**
 * Busca histórico de taxas TR
 */
export async function getTRRatesHistory(
  startDate: string,
  endDate: string,
  accessToken: string
): Promise<TRRate[]> {
  const { createUserClient } = await import('../lib/supabase.js');
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TR_RATES_TABLE)
    .select('*')
    .gte('reference_date', startDate)
    .lte('reference_date', endDate)
    .order('reference_date', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar histórico TR: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca última taxa TR disponível
 */
export async function getLatestTRRate(accessToken: string): Promise<TRRate | null> {
  const { createUserClient } = await import('../lib/supabase.js');
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TR_RATES_TABLE)
    .select('*')
    .order('reference_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar última taxa TR: ${error.message}`);
  }

  return data;
}
