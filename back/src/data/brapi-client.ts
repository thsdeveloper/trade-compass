import type { Candle } from '../domain/types.js';

const BASE_URL = 'https://brapi.dev/api';

// Tipo para resultado de cotacao
export interface QuoteResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date;
  regularMarketVolume?: number;
  marketCap?: number;
}

export class BrapiClient {
    private token: string;
    private cache: Map<string, { data: Candle[]; timestamp: number }> = new Map();
    private cacheTimeout = 1 * 60 * 1000; // 1 minute

    constructor() {
        this.token = process.env.BRAPI_TOKEN || '';
        if (!this.token) {
            console.warn('[BrapiClient] WARN: BRAPI_TOKEN not found in environment variables. Requests may fail or be limited.');
        }
    }

    private getAuthParams(): string {
        return this.token ? `token=${this.token}` : '';
    }

    /**
     * Fetches historical data from Brapi.
     * Brapi supports range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
     * Brapi supports interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
     */
    async getHistoricalData(
        ticker: string,
        range: string = '2y',
        interval: string = '1d'
    ): Promise<Candle[]> {
        const cacheKey = `${ticker}-${range}-${interval}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            // Even with cache, update last candle with real-time quote
            const updatedCandles = await this.updateLastCandleWithQuote([...cached.data], ticker, interval);
            return updatedCandles;
        }

        try {
            console.log(`[brapi] Fetching ${ticker} (range: ${range}, interval: ${interval})...`);

            // Construct URL
            // Endpoint: /api/quote/{ticker}?range={range}&interval={interval}&token={token}
            const params = new URLSearchParams();
            params.append('range', range);
            params.append('interval', interval);
            if (this.token) {
                params.append('token', this.token);
            }

            // Brapi expects comma separated tickers if multiple, but we fetch one by one here usually.
            // Ticker should probably NOT have .SA for Brapi? 
            // Brapi documentation usually shows ticker like 'PETR4'. 
            // If we send 'PETR4.SA', it might work or not. Let's try to strip .SA if present, 
            // but Brapi actually supports specific tickers. 
            // However, their example uses 'PETR4'.
            const cleanTicker = ticker.toUpperCase().replace('.SA', '').trim();

            const url = `${BASE_URL}/quote/${cleanTicker}?${params.toString()}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Brapi API error: ${response.status} ${response.statusText}`);
            }

            const data: any = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error(`No data found for ${ticker}`);
            }

            const result = data.results[0];
            const historicals = result.historicalDataPrice;

            if (!historicals || !Array.isArray(historicals)) {
                // Did we get data?
                // Sometimes short range requests might return different structure? 
                // Assuming standard structure based on docs.
                console.warn(`[brapi] No historical data in response for ${ticker}`);
                return [];
            }

            const candles: Candle[] = historicals.map((item: any) => {
                // Brapi date is unix timestamp (seconds) or ISO string?
                // Docs example: "date": 167... (int)
                // But let's check. If it is number, convert to date.

                let timeStr: string;
                if (typeof item.date === 'number') {
                    // Brapi returns timestamp in seconds usually
                    timeStr = new Date(item.date * 1000).toISOString();
                } else {
                    timeStr = new Date(item.date).toISOString();
                }

                // For daily candles, we might want just YYYY-MM-DD
                if (interval === '1d' || interval === '1wk' || interval === '1mo') {
                    timeStr = timeStr.split('T')[0];
                }

                return {
                    time: timeStr,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume || 0
                };
            });

            // Sort by time just in case
            candles.sort((a, b) => a.time.localeCompare(b.time));

            // Cache historical data (without real-time update)
            this.cache.set(cacheKey, { data: [...candles], timestamp: Date.now() });

            // Add/update current candle from real-time quote
            const updatedCandles = await this.updateLastCandleWithQuote(candles, ticker, interval);

            const lastClose = updatedCandles.length > 0 ? updatedCandles[updatedCandles.length - 1].close : 0;
            console.log(`[brapi] ${ticker}: ${updatedCandles.length} candles - Last close: ${lastClose.toFixed(2)}`);

            return updatedCandles;

        } catch (error) {
            console.error(`[brapi] Error fetching ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Updates the last candle with real-time quote data
     */
    private async updateLastCandleWithQuote(candles: Candle[], ticker: string, interval: string): Promise<Candle[]> {
        const currentCandle = await this.getCurrentCandle(ticker, interval);
        if (!currentCandle || candles.length === 0) return candles;

        const lastCandle = candles[candles.length - 1];

        // Only add if current candle is newer than last historical candle
        if (currentCandle.time > lastCandle.time) {
            candles.push(currentCandle);
            console.log(`[brapi] Added current candle: ${currentCandle.time} close=${currentCandle.close}`);
        } else if (currentCandle.time === lastCandle.time) {
            // Update last candle with real-time data
            candles[candles.length - 1] = currentCandle;
            console.log(`[brapi] Updated last candle with real-time data: ${currentCandle.close}`);
        }

        return candles;
    }

    /**
     * Creates a candle from the current real-time quote
     */
    private async getCurrentCandle(ticker: string, interval: string): Promise<Candle | null> {
        try {
            const quote = await this.getQuote(ticker);
            if (!quote || !quote.regularMarketPrice) return null;

            const now = new Date();
            let timeStr: string;

            if (interval === '1d' || interval === '1wk' || interval === '1mo') {
                // For daily, use today's date
                timeStr = now.toISOString().split('T')[0];
            } else {
                // For intraday, align to interval
                const intervalMinutes = this.parseIntervalMinutes(interval);
                const alignedTime = this.alignToInterval(now, intervalMinutes);
                timeStr = alignedTime.toISOString();
            }

            return {
                time: timeStr,
                open: quote.regularMarketDayLow || quote.regularMarketPrice, // Approximate open
                high: quote.regularMarketDayHigh || quote.regularMarketPrice,
                low: quote.regularMarketDayLow || quote.regularMarketPrice,
                close: quote.regularMarketPrice,
                volume: quote.regularMarketVolume || 0
            };
        } catch {
            return null;
        }
    }

    /**
     * Parse interval string to minutes
     */
    private parseIntervalMinutes(interval: string): number {
        const match = interval.match(/^(\d+)(m|h)?$/);
        if (!match) return 60;
        const value = parseInt(match[1]);
        const unit = match[2] || 'm';
        return unit === 'h' ? value * 60 : value;
    }

    /**
     * Align date to interval boundary
     */
    private alignToInterval(date: Date, intervalMinutes: number): Date {
        const aligned = new Date(date);
        const minutes = aligned.getMinutes();
        const alignedMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes;
        aligned.setMinutes(alignedMinutes, 0, 0);
        return aligned;
    }

    /**
     * Fetches current quote
     */
    async getQuote(ticker: string): Promise<QuoteResult | null> {
        try {
            const cleanTicker = ticker.toUpperCase().replace('.SA', '').trim();
            const params = new URLSearchParams();
            if (this.token) params.append('token', this.token);

            const url = `${BASE_URL}/quote/${cleanTicker}?${params.toString()}`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const data: any = await response.json();
            if (!data.results || data.results.length === 0) return null;

            const result = data.results[0];

            return {
                symbol: result.symbol,
                shortName: result.shortName,
                longName: result.longName,
                currency: result.currency,
                regularMarketPrice: result.regularMarketPrice,
                regularMarketDayHigh: result.regularMarketDayHigh,
                regularMarketDayLow: result.regularMarketDayLow,
                regularMarketChange: result.regularMarketChange,
                regularMarketChangePercent: result.regularMarketChangePercent,
                regularMarketTime: new Date(result.regularMarketTime),
                regularMarketVolume: result.regularMarketVolume,
                marketCap: result.marketCap
            };
        } catch (error) {
            console.error(`[brapi] Error fetching quote for ${ticker}:`, error);
            return null;
        }
    }
}

export const brapiClient = new BrapiClient();
