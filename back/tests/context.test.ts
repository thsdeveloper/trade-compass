import { describe, it, expect } from 'vitest';
import {
  calculateTrend,
  calculateVolumeLevel,
  calculateVolatilityLevel,
  calculateContext,
} from '../src/engine/context.js';
import type { Candle } from '../src/domain/types.js';

function makeCandles(count: number, basePrice: number, trend: 'up' | 'down' | 'flat' = 'flat'): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    if (trend === 'up') price += 0.5;
    if (trend === 'down') price -= 0.5;

    candles.push({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: price - 0.2,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000,
    });
  }
  return candles;
}

describe('Context Calculator', () => {
  describe('calculateTrend()', () => {
    it('should detect Alta when price above SMA50 and SMA20 > SMA50', () => {
      // Create uptrending data
      const candles = makeCandles(100, 50, 'up');
      const trend = calculateTrend(candles);
      expect(trend).toBe('Alta');
    });

    it('should detect Baixa when price below SMA50 and SMA20 < SMA50', () => {
      // Create downtrending data
      const candles = makeCandles(100, 100, 'down');
      const trend = calculateTrend(candles);
      expect(trend).toBe('Baixa');
    });

    it('should detect Lateral when mixed conditions', () => {
      // Create flat data
      const candles = makeCandles(100, 50, 'flat');
      const trend = calculateTrend(candles);
      expect(trend).toBe('Lateral');
    });
  });

  describe('calculateVolumeLevel()', () => {
    it('should return Abaixo when volume ratio < 0.8', () => {
      const candles = makeCandles(30, 50);
      // Make last candle have low volume
      candles[candles.length - 1].volume = 500000;
      const level = calculateVolumeLevel(candles);
      expect(level).toBe('Abaixo');
    });

    it('should return Acima when volume ratio > 1.2', () => {
      const candles = makeCandles(30, 50);
      // Make last candle have high volume
      candles[candles.length - 1].volume = 2000000;
      const level = calculateVolumeLevel(candles);
      expect(level).toBe('Acima');
    });

    it('should return Normal when volume ratio is between 0.8 and 1.2', () => {
      const candles = makeCandles(30, 50);
      const level = calculateVolumeLevel(candles);
      expect(level).toBe('Normal');
    });
  });

  describe('calculateVolatilityLevel()', () => {
    it('should return Baixa when ATR% < 1.5', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 20; i++) {
        candles.push({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 100.5, // Very small range
          low: 99.5,
          close: 100,
          volume: 1000000,
        });
      }
      const level = calculateVolatilityLevel(candles);
      expect(level).toBe('Baixa');
    });

    it('should return Alta when ATR% > 3', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 20; i++) {
        candles.push({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 106, // Large range
          low: 94,
          close: 100,
          volume: 1000000,
        });
      }
      const level = calculateVolatilityLevel(candles);
      expect(level).toBe('Alta');
    });
  });

  describe('calculateContext()', () => {
    it('should return complete context object', () => {
      const candles = makeCandles(100, 50, 'up');
      const context = calculateContext(candles);

      expect(context).toHaveProperty('trend');
      expect(context).toHaveProperty('volume');
      expect(context).toHaveProperty('volatility');
      expect(['Alta', 'Baixa', 'Lateral']).toContain(context.trend);
      expect(['Abaixo', 'Normal', 'Acima']).toContain(context.volume);
      expect(['Baixa', 'Media', 'Alta']).toContain(context.volatility);
    });
  });
});
