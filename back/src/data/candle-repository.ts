import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Candle } from '../domain/types.js';
import { DEFAULT_CANDLE_LIMIT } from '../domain/constants.js';
import { yahooClient } from './yahoo-finance-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OHLCV_DIR = join(__dirname, 'ohlcv');

// Cache em memoria (dados do Yahoo Finance ou locais)
const candleCache: Map<string, { candles: Candle[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Flag para usar Yahoo Finance (pode ser desabilitado para testes)
let useYahoo = true;

export function setUseYahoo(value: boolean): void {
  useYahoo = value;
}

// Alias para compatibilidade com testes existentes
export function setUseBrapi(value: boolean): void {
  useYahoo = value;
}

/**
 * Carrega candles do arquivo local (fallback)
 */
function loadCandlesFromFile(ticker: string): Candle[] | null {
  const normalized = ticker.toUpperCase().trim();
  const filePath = join(OHLCV_DIR, `${normalized.toLowerCase()}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Carrega candles do Yahoo Finance
 */
async function loadCandlesFromYahoo(ticker: string): Promise<Candle[] | null> {
  const normalized = ticker.toUpperCase().trim();

  try {
    // Buscar 2 anos de dados (Yahoo Finance nao tem limitacao como Brapi)
    const candles = await yahooClient.getHistoricalData(normalized, '2y', '1d');
    if (candles && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      console.log(`[candle-repository] ${normalized}: YAHOO OK - ${candles.length} candles, ultima data: ${lastCandle.time}, close: R$ ${lastCandle.close.toFixed(2)}`);
    }
    return candles;
  } catch (error) {
    console.error(`[candle-repository] ${normalized}: YAHOO FALHOU -`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Carrega candles com fallback (Yahoo Finance -> arquivo local)
 */
async function loadCandles(ticker: string): Promise<Candle[] | null> {
  const normalized = ticker.toUpperCase().trim();

  // Verificar cache
  const cached = candleCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.candles;
  }

  let candles: Candle[] | null = null;

  // Tentar Yahoo Finance primeiro (se habilitado)
  if (useYahoo) {
    candles = await loadCandlesFromYahoo(normalized);
  }

  // Fallback para arquivo local
  if (!candles) {
    candles = loadCandlesFromFile(normalized);
    if (candles && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      console.warn(`[candle-repository] ${normalized}: FALLBACK LOCAL - ${candles.length} candles, ultima data: ${lastCandle.time}, close: R$ ${lastCandle.close.toFixed(2)}`);
      console.warn(`[candle-repository] ATENCAO: Dados podem estar desatualizados! Verifique a conexao com Yahoo Finance.`);
    }
  }

  // Salvar no cache
  if (candles && candles.length > 0) {
    candleCache.set(normalized, { candles, timestamp: Date.now() });
  }

  return candles;
}

/**
 * Versao sincrona para compatibilidade (usa cache ou arquivo local)
 */
function loadCandlesSync(ticker: string): Candle[] | null {
  const normalized = ticker.toUpperCase().trim();

  // Verificar cache primeiro
  const cached = candleCache.get(normalized);
  if (cached) {
    return cached.candles;
  }

  // Fallback para arquivo local (sincrono)
  return loadCandlesFromFile(normalized);
}

/**
 * Obtem candles de um ativo (async - usa Yahoo Finance)
 */
export async function getCandlesAsync(
  ticker: string,
  limit: number = DEFAULT_CANDLE_LIMIT
): Promise<Candle[] | null> {
  const allCandles = await loadCandles(ticker);

  if (!allCandles) {
    return null;
  }

  // Retornar os ultimos N candles
  if (limit >= allCandles.length) {
    return allCandles;
  }

  return allCandles.slice(-limit);
}

/**
 * Obtem candles de um ativo (sync - usa cache ou arquivo local)
 * Mantido para compatibilidade com codigo existente
 */
export function getCandles(
  ticker: string,
  limit: number = DEFAULT_CANDLE_LIMIT
): Candle[] | null {
  const allCandles = loadCandlesSync(ticker);

  if (!allCandles) {
    return null;
  }

  // Retornar os ultimos N candles
  if (limit >= allCandles.length) {
    return allCandles;
  }

  return allCandles.slice(-limit);
}

/**
 * Obtem o ultimo candle
 */
export function getLatestCandle(ticker: string): Candle | null {
  const candles = getCandles(ticker, 1);
  return candles && candles.length > 0 ? candles[candles.length - 1] : null;
}

/**
 * Obtem o ultimo candle (async)
 */
export async function getLatestCandleAsync(ticker: string): Promise<Candle | null> {
  const candles = await getCandlesAsync(ticker, 1);
  return candles && candles.length > 0 ? candles[candles.length - 1] : null;
}

/**
 * Verifica se tem dados suficientes
 */
export function hasEnoughData(ticker: string, minCandles: number): boolean {
  const candles = loadCandlesSync(ticker);
  return candles !== null && candles.length >= minCandles;
}

/**
 * Verifica se tem dados suficientes (async)
 */
export async function hasEnoughDataAsync(ticker: string, minCandles: number): Promise<boolean> {
  const candles = await loadCandles(ticker);
  return candles !== null && candles.length >= minCandles;
}

/**
 * Pre-carrega dados de um ticker (util para inicializacao)
 */
export async function preloadCandles(ticker: string): Promise<boolean> {
  const candles = await loadCandles(ticker);
  return candles !== null && candles.length > 0;
}

/**
 * Pre-carrega dados de multiplos tickers
 */
export async function preloadMultipleTickers(tickers: string[]): Promise<void> {
  console.log(`[candle-repository] Pre-carregando ${tickers.length} tickers...`);

  const results = await Promise.allSettled(
    tickers.map((ticker) => preloadCandles(ticker))
  );

  const loaded = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;

  console.log(`[candle-repository] ${loaded}/${tickers.length} tickers carregados`);
}

/**
 * Limpa o cache
 */
export function clearCache(): void {
  candleCache.clear();
}
