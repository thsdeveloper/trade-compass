import YahooFinance from 'yahoo-finance2';
import type { Candle } from '../domain/types.js';

// Criar instancia do Yahoo Finance (requerido na v3)
const yahooFinance = new YahooFinance();

export interface QuoteResult {
  symbol: string;
  shortName: string | undefined;
  longName: string | undefined;
  currency: string | undefined;
  regularMarketPrice: number | undefined;
  regularMarketDayHigh: number | undefined;
  regularMarketDayLow: number | undefined;
  regularMarketChange: number | undefined;
  regularMarketChangePercent: number | undefined;
  regularMarketTime: Date | undefined;
  regularMarketVolume: number | undefined;
  marketCap: number | undefined;
}

export class YahooFinanceClient {
  private cache: Map<string, { data: Candle[]; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos

  /**
   * Normaliza o ticker para formato Yahoo Finance (adiciona .SA para tickers brasileiros)
   */
  private normalizeTickerForYahoo(ticker: string): string {
    const normalized = ticker.toUpperCase().trim();
    // Se ja tem .SA ou outro sufixo, retorna como esta
    if (normalized.includes('.')) {
      return normalized;
    }
    // Para tickers brasileiros, adiciona .SA
    return `${normalized}.SA`;
  }

  /**
   * Remove o sufixo .SA do ticker para uso interno
   */
  private normalizeTickerInternal(ticker: string): string {
    return ticker.toUpperCase().trim().replace('.SA', '');
  }

  /**
   * Busca dados historicos de um ativo
   */
  async getHistoricalData(
    ticker: string,
    period: string = '2y',
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<Candle[]> {
    const internalTicker = this.normalizeTickerInternal(ticker);
    const yahooTicker = this.normalizeTickerForYahoo(ticker);
    const cacheKey = `${internalTicker}-${period}-${interval}`;

    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`[yahoo] Buscando ${yahooTicker}...`);

      // Calcular data inicial baseada no periodo
      const now = new Date();
      let period1: Date;

      switch (period) {
        case '1mo':
          period1 = new Date(now);
          period1.setMonth(period1.getMonth() - 1);
          break;
        case '3mo':
          period1 = new Date(now);
          period1.setMonth(period1.getMonth() - 3);
          break;
        case '6mo':
          period1 = new Date(now);
          period1.setMonth(period1.getMonth() - 6);
          break;
        case '1y':
          period1 = new Date(now);
          period1.setFullYear(period1.getFullYear() - 1);
          break;
        case '2y':
        default:
          period1 = new Date(now);
          period1.setFullYear(period1.getFullYear() - 2);
          break;
        case '5y':
          period1 = new Date(now);
          period1.setFullYear(period1.getFullYear() - 5);
          break;
      }

      const result = await yahooFinance.chart(yahooTicker, {
        period1,
        period2: now,
        interval,
      });

      if (!result.quotes || result.quotes.length === 0) {
        throw new Error(`Sem dados historicos para ${yahooTicker}`);
      }

      // Converter para formato Candle
      // Para candles com dados incompletos (dia atual), usar close para preencher OHLV
      const candles: Candle[] = result.quotes
        .filter((quote) => quote.close !== null && quote.close !== 0)
        .map((quote) => {
          const close = quote.close as number;
          // Se open/high/low sao 0 ou null, usar o close (comum no dia atual)
          const open = (quote.open && quote.open !== 0) ? quote.open : close;
          const high = (quote.high && quote.high !== 0) ? quote.high : close;
          const low = (quote.low && quote.low !== 0) ? quote.low : close;
          const volume = quote.volume ?? 0;

          return {
            time: quote.date.toISOString().split('T')[0],
            open,
            high,
            low,
            close,
            volume,
          };
        });

      // Ordenar por data (mais antigo primeiro)
      candles.sort((a, b) => a.time.localeCompare(b.time));

      // Salvar no cache
      this.cache.set(cacheKey, { data: candles, timestamp: Date.now() });

      const firstDate = candles.length > 0 ? candles[0].time : 'N/A';
      const lastDate = candles.length > 0 ? candles[candles.length - 1].time : 'N/A';
      const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
      console.log(
        `[yahoo] ${internalTicker}: ${candles.length} candles (${firstDate} a ${lastDate}) - Ultimo close: R$ ${lastClose.toFixed(2)}`
      );

      return candles;
    } catch (error) {
      console.error(`[yahoo] Erro ao buscar ${yahooTicker}:`, error);
      throw error;
    }
  }

  /**
   * Busca cotacao atual de um ativo
   */
  async getQuote(ticker: string): Promise<QuoteResult | null> {
    const yahooTicker = this.normalizeTickerForYahoo(ticker);

    try {
      const quote = await yahooFinance.quote(yahooTicker);

      if (!quote) {
        return null;
      }

      return {
        symbol: quote.symbol,
        shortName: quote.shortName,
        longName: quote.longName,
        currency: quote.currency,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketDayHigh: quote.regularMarketDayHigh,
        regularMarketDayLow: quote.regularMarketDayLow,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketTime: quote.regularMarketTime,
        regularMarketVolume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
      };
    } catch (error) {
      console.error(`[yahoo] Erro ao buscar cotacao de ${yahooTicker}:`, error);
      return null;
    }
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const yahooClient = new YahooFinanceClient();
