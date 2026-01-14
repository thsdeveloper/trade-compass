import { supabaseAdmin } from '../lib/supabase.js';
import type { HistoricalSignal, SignalStatus, SetupType } from '../engine/setups/setup-123-history.js';

const TABLE = 'setup_signals';

// Helper para acessar a tabela
const signalsTable = () => supabaseAdmin.from(TABLE);

/**
 * Linha do banco de dados
 */
export interface SignalRow {
  id: string;
  ticker: string;
  setup_type: SetupType;
  timeframe: string;
  signal_time: string;
  p1_index: number;
  p2_index: number;
  p3_index: number;
  p1_price: number;
  p2_price: number;
  p3_price: number;
  entry_price: number;
  stop_price: number;
  target_price: number;
  status: SignalStatus;
  resolved_at: string | null;
  resolved_price: number | null;
  candles_to_resolve: number | null;
  created_at: string;
}

/**
 * Estatisticas de sinais
 */
export interface SignalStats {
  total: number;
  success: number;
  failure: number;
  pending: number;
  expired: number;
  successRate: number;
}

/**
 * Busca sinais historicos por ticker
 */
export async function getSignalsByTicker(
  ticker: string,
  limit: number = 100
): Promise<SignalRow[]> {
  const { data, error } = await signalsTable()
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .order('signal_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao buscar sinais: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca sinais por ticker e timeframe
 */
export async function getSignalsByTickerAndTimeframe(
  ticker: string,
  timeframe: string,
  limit: number = 100
): Promise<SignalRow[]> {
  const { data, error } = await signalsTable()
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .eq('timeframe', timeframe)
    .order('signal_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao buscar sinais: ${error.message}`);
  }

  return data || [];
}

/**
 * Insere ou atualiza sinais (upsert por unique constraint)
 */
export async function upsertSignals(signals: HistoricalSignal[]): Promise<number> {
  if (signals.length === 0) return 0;

  const rows = signals.map(s => ({
    ticker: s.ticker.toUpperCase(),
    setup_type: s.setupType,
    timeframe: s.timeframe,
    signal_time: s.signalTime,
    p1_index: s.p1Index,
    p2_index: s.p2Index,
    p3_index: s.p3Index,
    p1_price: s.p1Price,
    p2_price: s.p2Price,
    p3_price: s.p3Price,
    entry_price: s.entryPrice,
    stop_price: s.stopPrice,
    target_price: s.targetPrice,
    status: s.status,
    resolved_at: s.resolvedAt || null,
    resolved_price: s.resolvedPrice || null,
    candles_to_resolve: s.candlesToResolve || null,
  }));

  const { error } = await signalsTable()
    .upsert(rows, { onConflict: 'ticker,setup_type,timeframe,signal_time' });

  if (error) {
    throw new Error(`Erro ao inserir sinais: ${error.message}`);
  }

  return rows.length;
}

/**
 * Busca estatisticas de sinais por ticker
 */
export async function getSignalStats(ticker: string): Promise<SignalStats> {
  const { data, error } = await signalsTable()
    .select('status')
    .eq('ticker', ticker.toUpperCase());

  if (error) {
    throw new Error(`Erro ao buscar estatisticas: ${error.message}`);
  }

  const stats: SignalStats = {
    total: 0,
    success: 0,
    failure: 0,
    pending: 0,
    expired: 0,
    successRate: 0
  };

  for (const row of data || []) {
    stats.total++;
    const status = row.status as SignalStatus;
    stats[status]++;
  }

  const resolved = stats.success + stats.failure;
  stats.successRate = resolved > 0 ? (stats.success / resolved) * 100 : 0;

  return stats;
}

/**
 * Busca estatisticas por ticker e tipo de setup
 */
export async function getSignalStatsByType(
  ticker: string,
  setupType: SetupType
): Promise<SignalStats> {
  const { data, error } = await signalsTable()
    .select('status')
    .eq('ticker', ticker.toUpperCase())
    .eq('setup_type', setupType);

  if (error) {
    throw new Error(`Erro ao buscar estatisticas: ${error.message}`);
  }

  const stats: SignalStats = {
    total: 0,
    success: 0,
    failure: 0,
    pending: 0,
    expired: 0,
    successRate: 0
  };

  for (const row of data || []) {
    stats.total++;
    const status = row.status as SignalStatus;
    stats[status]++;
  }

  const resolved = stats.success + stats.failure;
  stats.successRate = resolved > 0 ? (stats.success / resolved) * 100 : 0;

  return stats;
}

/**
 * Conta total de sinais no banco
 */
export async function countAllSignals(): Promise<number> {
  const { count, error } = await signalsTable()
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Erro ao contar sinais: ${error.message}`);
  }

  return count || 0;
}

/**
 * Remove todos os sinais de um ticker (util para re-sincronizacao)
 */
export async function deleteSignalsByTicker(ticker: string): Promise<void> {
  const { error } = await signalsTable()
    .delete()
    .eq('ticker', ticker.toUpperCase());

  if (error) {
    throw new Error(`Erro ao remover sinais: ${error.message}`);
  }
}
