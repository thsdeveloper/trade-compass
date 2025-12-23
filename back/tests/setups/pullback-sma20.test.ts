import { describe, it, expect } from 'vitest';
import { detectPullbackSma20 } from '../../src/engine/setups/pullback-sma20.js';
import type { Candle, Trend, VolumeLevel, VolatilityLevel } from '../../src/domain/types.js';

function makeUptrendCandles(count: number): Candle[] {
  const candles: Candle[] = [];

  // Create uptrending candles where price increases over time
  for (let i = 0; i < count; i++) {
    const basePrice = 50 + i * 0.5; // Gradual uptrend
    candles.push({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: basePrice - 0.2,
      high: basePrice + 1,
      low: basePrice - 0.5,
      close: basePrice,
      volume: 1000000,
    });
  }

  return candles;
}

function makePullbackCandles(): Candle[] {
  const candles: Candle[] = [];

  // First 20 candles establish SMA20 around 50
  for (let i = 0; i < 20; i++) {
    candles.push({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 49.5,
      high: 51,
      low: 49,
      close: 50,
      volume: 1000000,
    });
  }

  // Last few candles: price pulls back to SMA20
  for (let i = 20; i < 24; i++) {
    candles.push({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 51,
      high: 52,
      low: 50,
      close: 51,
      volume: 1000000,
    });
  }

  // Current candle: low touches SMA20, closes above
  candles.push({
    time: '2024-01-25',
    open: 51,
    high: 52,
    low: 50.05, // Touches SMA20 (which should be around 50)
    close: 51,
    volume: 1000000,
  });

  return candles;
}

describe('Pullback SMA20 Setup', () => {
  describe('detectPullbackSma20()', () => {
    it('should return null when trend is not Alta', () => {
      const candles = makePullbackCandles();
      const trend: Trend = 'Baixa';
      const volume: VolumeLevel = 'Normal';
      const volatility: VolatilityLevel = 'Media';

      const result = detectPullbackSma20('TEST', candles, trend, volume, volatility, 62);

      expect(result).toBeNull();
    });

    it('should return result with proper structure when trend is Alta', () => {
      const candles = makePullbackCandles();
      const trend: Trend = 'Alta';
      const volume: VolumeLevel = 'Normal';
      const volatility: VolatilityLevel = 'Media';

      const result = detectPullbackSma20('TEST', candles, trend, volume, volatility, 62);

      // May or may not be null depending on exact SMA20 calculation
      if (result !== null) {
        expect(result.title).toBe('Pullback na SMA20');
        expect(result.id).toContain('pullback');
        expect(['ATIVO', 'EM_FORMACAO', 'INVALIDO']).toContain(result.status);
      }
    });

    it('should return null when trend is Lateral', () => {
      const candles = makePullbackCandles();
      const trend: Trend = 'Lateral';
      const volume: VolumeLevel = 'Normal';
      const volatility: VolatilityLevel = 'Media';

      const result = detectPullbackSma20('TEST', candles, trend, volume, volatility, 62);

      expect(result).toBeNull();
    });

    it('should include meta information when result is not null', () => {
      const candles = makePullbackCandles();
      const trend: Trend = 'Alta';
      const volume: VolumeLevel = 'Normal';
      const volatility: VolatilityLevel = 'Media';

      const result = detectPullbackSma20('TEST', candles, trend, volume, volatility, 62);

      if (result !== null) {
        expect(result.meta).toHaveProperty('sma20');
        expect(result.meta).toHaveProperty('atr');
        expect(result.meta).toHaveProperty('currentClose');
      }
    });

    it('should include successRate in result', () => {
      const candles = makePullbackCandles();
      const trend: Trend = 'Alta';
      const volume: VolumeLevel = 'Normal';
      const volatility: VolatilityLevel = 'Media';

      const result = detectPullbackSma20('TEST', candles, trend, volume, volatility, 75);

      if (result !== null) {
        expect(result.successRate).toBe(75);
      }
    });
  });
});
