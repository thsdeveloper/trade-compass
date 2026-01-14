import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Candle } from '../domain/types.js';
import { DEFAULT_CANDLE_LIMIT } from '../domain/constants.js';
import { brapiClient } from './brapi-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OHLCV_DIR = join(__dirname, 'ohlcv');

const candleCache: Map<string, { candles: Candle[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function loadCandlesFromFile(ticker: string, interval: string = '1d'): Candle[] | null {
  // Local files simplistic assumption: only daily (1d) or filename suffix
  const normalized = ticker.toUpperCase().trim();
  // Se for 120min ou intraday, talvez nao tenhamos arquivos locais, ou teriam que ter sufixo
  // Fallback local geralmente é só para testes daily, vamos manter daily
  if (interval !== '1d') return null;

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
 * Resample candles (e.g., 60m -> 120m)
 */
function resampleCandles(candles: Candle[], targetMinutes: number): Candle[] {
  // Assume source candles are 60m (or roughly 1h apart)
  // We want to combine N candles into 1
  // If target is 120m, we combine 2 candles.

  // Basic logic:
  // Iterate candles. Group by time window or simply combine chunks of 2.
  // Grouping by time window is safer (e.g. 10:00+11:00 = 10:00-12:00 block)

  if (candles.length === 0) return [];

  // Determine source interval roughly
  // const t1 = new Date(candles[0].time).getTime();
  // const t2 = new Date(candles[1].time).getTime();
  // const diffMinutes = (t2 - t1) / 60000; 
  // Naive: assume they are 60m if requesting 120m from 60m source

  const resampled: Candle[] = [];
  let currentBlock: Candle[] = [];
  const msPerBlock = targetMinutes * 60 * 1000;

  // Align to first candle? Or align to standard hours?
  // Let's do simple aggregation of every 2 candles if target=120 and source=60
  // But source is time-based.

  // Better approach: Bucket by start time.
  // Standard market hours (UTC-3): 10:00, 12:00, 14:00, 16:00.
  // We should try to align with these.

  // Note: candle.time is ISO string.

  // Let's iterate and build blocks.
  // If we assume sequential data without gaps:
  // [10:00, 11:00] -> 120m 10:00
  // [12:00, 13:00] -> 120m 12:00

  for (const candle of candles) {
    const date = new Date(candle.time);
    const hour = date.getHours(); // Local timezone might affect this if node env is different.
    // candle.time is ISO string from BRAPI client

    // Check if we start a new block
    // For 120min, we want even hours? 10, 12, 14, 16.
    // So if hour is even (10, 12...), it starts a block?
    // Or if we just group every 2.

    // Grouping every 2, creating a new candle when block is full
    currentBlock.push(candle);

    // If target 120m (2 hours), from 60m source: Need 2 candles.
    // But sometimes gaps happen (lunch break? no, B3 has no lunch break usually).
    // Let's use simple count for now: 2 candles = 1 block.
    // Improve later if strict time alignment is needed.

    if (currentBlock.length === 2) {
      const o = currentBlock[0].open;
      const h = Math.max(currentBlock[0].high, currentBlock[1].high);
      const l = Math.min(currentBlock[0].low, currentBlock[1].low);
      const c = currentBlock[1].close;
      const v = currentBlock[0].volume + currentBlock[1].volume;
      const t = currentBlock[0].time; // Time of the start of the block

      resampled.push({ open: o, high: h, low: l, close: c, volume: v, time: t });
      currentBlock = [];
    }
  }

  // If left over candle? discard or keep? 
  // Usually discard if incomplete block.

  return resampled;
}

async function loadCandlesFromExternal(ticker: string, timeframe: string): Promise<Candle[] | null> {
  const normalized = ticker.toUpperCase().trim();

  try {
    let brapiInterval = '1d';
    let brapiRange = '2y';
    let needsResampling = false;
    let targetMinutes = 0;

    // Mapping timeframe to Brapi params
    if (timeframe === '120m' || timeframe === '120min' || timeframe === '2h') {
      brapiInterval = '60m';
      brapiRange = '2y';
      needsResampling = true;
      targetMinutes = 120;
    } else if (timeframe === '60m' || timeframe === '1h') {
      brapiInterval = '60m';
      brapiRange = '1y';
    } else if (timeframe === '30m') {
      brapiInterval = '30m';
      brapiRange = '1mo';
    } else if (timeframe === '15m') {
      brapiInterval = '15m';
      brapiRange = '1mo';
    } else if (timeframe === '5m') {
      brapiInterval = '5m';
      brapiRange = '5d';
    } else if (timeframe === '1wk' || timeframe === 'weekly') {
      brapiInterval = '1wk';
      brapiRange = '5y';
    } else if (timeframe === '1mo' || timeframe === 'monthly') {
      brapiInterval = '1mo';
      brapiRange = '10y';
    } else {
      brapiInterval = '1d';
      brapiRange = '2y';
    }

    const candles = await brapiClient.getHistoricalData(normalized, brapiRange, brapiInterval);

    if (candles && candles.length > 0) {
      if (needsResampling && targetMinutes > 0) {
        const resampled = resampleCandles(candles, targetMinutes);
        console.log(`[candle-repository] Resampled ${candles.length} (60m) -> ${resampled.length} (120m) candles.`);
        return resampled;
      }

      const lastCandle = candles[candles.length - 1];
      console.log(`[candle-repository] ${normalized}: BRAPI OK (${timeframe}) - ${candles.length} candles, ultima: ${lastCandle.time}`);
      return candles;
    }
    return candles;
  } catch (error) {
    console.error(`[candle-repository] ${normalized}: BRAPI FALHOU -`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function loadCandles(ticker: string, timeframe: string = '1d'): Promise<Candle[] | null> {
  const normalized = ticker.toUpperCase().trim();
  const cacheKey = `${normalized}-${timeframe}`;

  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.candles;
  }

  let candles: Candle[] | null = null;

  // Fetch from external source
  candles = await loadCandlesFromExternal(normalized, timeframe);

  // Fallback local only valid for daily
  if (!candles && timeframe === '1d') {
    candles = loadCandlesFromFile(normalized, timeframe);
  }

  if (candles && candles.length > 0) {
    candleCache.set(cacheKey, { candles, timestamp: Date.now() });
  }

  return candles;
}

export async function getCandlesAsync(
  ticker: string,
  limit: number = DEFAULT_CANDLE_LIMIT,
  timeframe: string = '1d'
): Promise<Candle[] | null> {
  const allCandles = await loadCandles(ticker, timeframe);

  if (!allCandles) {
    return null;
  }

  if (limit >= allCandles.length) {
    return allCandles;
  }

  return allCandles.slice(-limit);
}

// Manter versoes Sync/Legacy para compatibilidade onde necessario, mas
// elas vao operar padrao com diario ou o que tiver em cache.
export function getCandles(
  ticker: string,
  limit: number = DEFAULT_CANDLE_LIMIT
): Candle[] | null {
  // Sync version uses cached data or local files
  // For async fetch, use getCandlesAsync instead
  const cacheKey = `${ticker.toUpperCase().trim()}-1d`;
  const cached = candleCache.get(cacheKey);
  if (cached) {
    const all = cached.candles;
    return limit >= all.length ? all : all.slice(-limit);
  }
  return loadCandlesFromFile(ticker, '1d'); // legacy fallback
}

export const getLatestCandle = (ticker: string) => {
  const c = getCandles(ticker, 1);
  return c ? c[c.length - 1] : null;
}

export const getLatestCandleAsync = async (ticker: string) => {
  const c = await getCandlesAsync(ticker, 1);
  return c ? c[c.length - 1] : null;
}
