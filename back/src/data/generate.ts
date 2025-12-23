import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Candle } from '../domain/types.js';
import { ASSETS, CANDLES_PER_TICKER } from '../domain/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OHLCV_DIR = join(__dirname, 'ohlcv');

// Seed para reproducibilidade
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// Gera uma sequencia de tendencias (up, down, lateral)
function generateTrendSequence(
  random: () => number,
  length: number
): ('up' | 'down' | 'lateral')[] {
  const trends: ('up' | 'down' | 'lateral')[] = [];
  let current: 'up' | 'down' | 'lateral' = 'lateral';
  let remaining = 0;

  for (let i = 0; i < length; i++) {
    if (remaining <= 0) {
      const r = random();
      if (r < 0.35) current = 'up';
      else if (r < 0.7) current = 'down';
      else current = 'lateral';
      remaining = Math.floor(random() * 40) + 20; // 20-60 candles por tendencia
    }
    trends.push(current);
    remaining--;
  }

  return trends;
}

// Configuracao inicial por ticker (precos reais aproximados)
const TICKER_CONFIG: Record<string, { basePrice: number; volatility: number }> = {
  PETR4: { basePrice: 38, volatility: 0.02 },
  VALE3: { basePrice: 62, volatility: 0.018 },
  ITUB4: { basePrice: 32, volatility: 0.015 },
  BBDC4: { basePrice: 15, volatility: 0.02 },
  ABEV3: { basePrice: 13, volatility: 0.012 },
  WEGE3: { basePrice: 41, volatility: 0.022 },
  MGLU3: { basePrice: 2, volatility: 0.05 },
  RENT3: { basePrice: 46, volatility: 0.025 },
};

function generateCandles(ticker: string, count: number): Candle[] {
  const config = TICKER_CONFIG[ticker] || { basePrice: 30, volatility: 0.02 };
  const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const random = seededRandom(seed);

  const trends = generateTrendSequence(random, count);
  const candles: Candle[] = [];

  let price = config.basePrice;
  const startDate = new Date('2022-01-03'); // Segunda-feira

  for (let i = 0; i < count; i++) {
    const trend = trends[i];
    const baseVolatility = config.volatility;

    // Drift baseado na tendencia
    let drift = 0;
    if (trend === 'up') drift = 0.002;
    else if (trend === 'down') drift = -0.002;

    // Variacao diaria com random walk
    const dailyReturn = drift + (random() - 0.5) * baseVolatility * 2;
    const close = price * (1 + dailyReturn);

    // OHLC realista
    const volatilityFactor = baseVolatility * (0.5 + random());
    const range = price * volatilityFactor;

    const open = price * (1 + (random() - 0.5) * 0.005);
    const high = Math.max(open, close) + random() * range * 0.5;
    const low = Math.min(open, close) - random() * range * 0.5;

    // Volume correlacionado com volatilidade e movimento
    const priceMove = Math.abs(close - open) / open;
    const baseVolume = 10_000_000 + random() * 20_000_000;
    const volumeMultiplier = 1 + priceMove * 10 + (random() - 0.3) * 0.5;
    const volume = Math.round(baseVolume * volumeMultiplier);

    // Calcular data (pular weekends)
    const currentDate = new Date(startDate);
    let daysToAdd = i;
    let dayOfWeek = currentDate.getDay();

    while (daysToAdd > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysToAdd--;
      }
    }

    candles.push({
      time: currentDate.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return candles;
}

function main() {
  console.log('Gerando dados OHLCV...\n');

  // Criar diretorio se nao existir
  if (!existsSync(OHLCV_DIR)) {
    mkdirSync(OHLCV_DIR, { recursive: true });
  }

  for (const asset of ASSETS) {
    const candles = generateCandles(asset.ticker, CANDLES_PER_TICKER);
    const filePath = join(OHLCV_DIR, `${asset.ticker.toLowerCase()}.json`);

    writeFileSync(filePath, JSON.stringify(candles, null, 2));

    const lastCandle = candles[candles.length - 1];
    console.log(
      `${asset.ticker}: ${CANDLES_PER_TICKER} candles | ` +
        `Ultimo preco: R$ ${lastCandle.close.toFixed(2)} | ` +
        `Data: ${lastCandle.time}`
    );
  }

  console.log('\nDados gerados com sucesso em:', OHLCV_DIR);
}

main();
