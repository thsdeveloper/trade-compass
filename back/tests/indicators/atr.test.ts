import { describe, it, expect } from 'vitest';
import { atr, trueRange } from '../../src/engine/indicators/atr.js';
import type { Candle } from '../../src/domain/types.js';

function makeCandle(open: number, high: number, low: number, close: number): Candle {
  return {
    time: '2024-01-01',
    open,
    high,
    low,
    close,
    volume: 1000000,
  };
}

describe('ATR - Average True Range', () => {
  describe('trueRange()', () => {
    it('should calculate TR as high-low when no previous candle', () => {
      const candle = makeCandle(100, 105, 95, 102);
      const result = trueRange(candle, null);
      expect(result).toBe(10); // 105 - 95
    });

    it('should calculate TR using previous close when gap up', () => {
      const prev = makeCandle(100, 105, 95, 102);
      const curr = makeCandle(110, 115, 108, 113);
      const result = trueRange(curr, prev);
      // TR = max(115-108, |115-102|, |108-102|) = max(7, 13, 6) = 13
      expect(result).toBe(13);
    });

    it('should calculate TR using previous close when gap down', () => {
      const prev = makeCandle(100, 105, 95, 102);
      const curr = makeCandle(90, 92, 88, 89);
      const result = trueRange(curr, prev);
      // TR = max(92-88, |92-102|, |88-102|) = max(4, 10, 14) = 14
      expect(result).toBe(14);
    });
  });

  describe('atr()', () => {
    it('should calculate ATR correctly', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 20; i++) {
        candles.push(makeCandle(100 + i, 105 + i, 95 + i, 102 + i));
      }
      const result = atr(14, candles);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(20);
    });

    it('should return null when not enough data', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 5; i++) {
        candles.push(makeCandle(100, 105, 95, 102));
      }
      const result = atr(14, candles);
      expect(result).toBeNull();
    });

    it('should return 0 for flat candles', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 20; i++) {
        candles.push(makeCandle(100, 100, 100, 100));
      }
      const result = atr(14, candles);
      expect(result).toBe(0);
    });
  });
});
