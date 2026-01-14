/**
 * Job de Sincronizacao de Sinais
 *
 * Popula o banco de dados com sinais historicos do setup 123
 * para todos os ativos cadastrados.
 *
 * Uso:
 *   pnpm --filter back sync:signals
 *   pnpm --filter back sync:signals PETR4 VALE3 (ativos especificos)
 */

// Carregar variaveis de ambiente ANTES de importar outros modulos
import 'dotenv/config';

import { ASSETS } from '../domain/constants.js';
import { getCandlesAsync } from '../data/candle-repository.js';
import { detectAllSetup123, calculateSignalStats } from '../engine/setups/setup-123-history.js';
import { upsertSignals, countAllSignals, deleteSignalsByTicker } from '../data/signal-repository.js';

// Configuracao
const CANDLES_TO_FETCH = 2000; // Aproximadamente 8 anos de candles diarios
const TIMEFRAME = '1d';
const DELAY_BETWEEN_ASSETS = 2000; // 2 segundos entre ativos para nao sobrecarregar API

async function syncSignalsForTicker(ticker: string): Promise<{
  ticker: string;
  success: boolean;
  signalsFound: number;
  error?: string;
}> {
  console.log(`\n[sync-signals] Sincronizando ${ticker}...`);

  try {
    // Buscar candles historicos
    const candles = await getCandlesAsync(ticker, CANDLES_TO_FETCH, TIMEFRAME);

    if (!candles || candles.length < 100) {
      console.log(`[sync-signals] ${ticker}: Dados insuficientes (${candles?.length || 0} candles)`);
      return { ticker, success: false, signalsFound: 0, error: 'Dados insuficientes' };
    }

    console.log(`[sync-signals] ${ticker}: ${candles.length} candles carregados`);

    // Detectar todos os sinais
    const signals = detectAllSetup123(ticker, candles, TIMEFRAME);

    if (signals.length === 0) {
      console.log(`[sync-signals] ${ticker}: Nenhum sinal encontrado`);
      return { ticker, success: true, signalsFound: 0 };
    }

    // Calcular estatisticas
    const stats = calculateSignalStats(signals);
    console.log(`[sync-signals] ${ticker}: ${signals.length} sinais detectados`);
    console.log(`[sync-signals] ${ticker}: Resultados:`);
    console.log(`[sync-signals]   - Take Profit (sucesso): ${stats.success} sinais`);
    console.log(`[sync-signals]   - Stop Loss (falha): ${stats.failure} sinais`);
    console.log(`[sync-signals]   - Pendentes (aguardando): ${stats.pending} sinais`);
    console.log(`[sync-signals]   - Expirados (nao executados): ${stats.expired} sinais`);
    console.log(`[sync-signals] ${ticker}: Taxa de sucesso: ${stats.successRate.toFixed(1)}% (${stats.success} TP / ${stats.success + stats.failure} resolvidos)`);

    // Limpar sinais antigos antes de inserir novos (para garantir dados limpos)
    await deleteSignalsByTicker(ticker);

    // Persistir no banco
    const inserted = await upsertSignals(signals);
    console.log(`[sync-signals] ${ticker}: ${inserted} sinais persistidos no banco`);

    return { ticker, success: true, signalsFound: signals.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sync-signals] ${ticker}: ERRO - ${message}`);
    return { ticker, success: false, signalsFound: 0, error: message };
  }
}

async function syncAllAssets(tickers?: string[]): Promise<void> {
  console.log('='.repeat(60));
  console.log('[sync-signals] Iniciando sincronizacao de sinais');
  console.log('='.repeat(60));

  const assetsToSync = tickers && tickers.length > 0
    ? ASSETS.filter(a => tickers.includes(a.ticker.toUpperCase()))
    : ASSETS;

  if (assetsToSync.length === 0) {
    console.log('[sync-signals] Nenhum ativo para sincronizar');
    return;
  }

  console.log(`[sync-signals] Ativos a sincronizar: ${assetsToSync.map(a => a.ticker).join(', ')}`);
  console.log(`[sync-signals] Timeframe: ${TIMEFRAME}`);
  console.log(`[sync-signals] Candles por ativo: ${CANDLES_TO_FETCH}`);

  const results: Array<{
    ticker: string;
    success: boolean;
    signalsFound: number;
    error?: string;
  }> = [];

  for (let i = 0; i < assetsToSync.length; i++) {
    const asset = assetsToSync[i];
    console.log(`\n[${i + 1}/${assetsToSync.length}] Processando ${asset.ticker} (${asset.name})`);

    const result = await syncSignalsForTicker(asset.ticker);
    results.push(result);

    // Aguardar entre ativos para nao sobrecarregar API
    if (i < assetsToSync.length - 1) {
      console.log(`[sync-signals] Aguardando ${DELAY_BETWEEN_ASSETS / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ASSETS));
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('[sync-signals] RESUMO DA SINCRONIZACAO');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalSignals = results.reduce((sum, r) => sum + r.signalsFound, 0);

  console.log(`[sync-signals] Ativos processados: ${results.length}`);
  console.log(`[sync-signals] Sucesso: ${successful.length}`);
  console.log(`[sync-signals] Falhas: ${failed.length}`);
  console.log(`[sync-signals] Total de sinais detectados: ${totalSignals}`);

  if (failed.length > 0) {
    console.log('\n[sync-signals] Ativos com falha:');
    for (const f of failed) {
      console.log(`  - ${f.ticker}: ${f.error}`);
    }
  }

  // Buscar estatisticas globais do banco
  try {
    const totalInDb = await countAllSignals();
    console.log(`\n[sync-signals] Total de sinais no banco: ${totalInDb}`);

    // Buscar estatisticas detalhadas de cada ativo processado
    if (successful.length > 0) {
      console.log('\n[sync-signals] ESTATISTICAS POR ATIVO:');
      console.log('-'.repeat(60));

      for (const result of successful) {
        if (result.signalsFound > 0) {
          const { getSignalStats } = await import('../data/signal-repository.js');
          const stats = await getSignalStats(result.ticker);
          const resolved = stats.success + stats.failure;
          const successRate = resolved > 0 ? ((stats.success / resolved) * 100).toFixed(1) : '0.0';

          console.log(`\n${result.ticker}:`);
          console.log(`  Take Profit (TP): ${stats.success}`);
          console.log(`  Stop Loss (SL):   ${stats.failure}`);
          console.log(`  Pendentes:        ${stats.pending}`);
          console.log(`  Expirados:        ${stats.expired}`);
          console.log(`  Taxa de Sucesso:  ${successRate}% (${stats.success}/${resolved})`);
        }
      }
    }
  } catch (error) {
    console.error('[sync-signals] Erro ao buscar estatisticas:', error);
  }

  console.log('\n[sync-signals] Sincronizacao concluida!');
}

// CLI
const args = process.argv.slice(2);
const tickers = args.length > 0 ? args.map(t => t.toUpperCase()) : undefined;

syncAllAssets(tickers)
  .then(() => {
    console.log('\n[sync-signals] Job finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[sync-signals] Job falhou:', error);
    process.exit(1);
  });
