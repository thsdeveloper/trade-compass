import { describe, it, expect } from 'vitest';
import { ema, emaSeries } from '../../src/engine/indicators/ema.js';

describe('EMA - Exponential Moving Average', () => {
  describe('ema()', () => {
    it('should calculate EMA correctly', () => {
      const closes = [22, 22.5, 22.25, 22.75, 23, 23.5, 23.25, 23.75, 24, 24.5];
      const result = ema(5, closes);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(23);
      expect(result).toBeLessThan(25);
    });

    it('should return null when not enough data', () => {
      const closes = [10, 20];
      const result = ema(5, closes);
      expect(result).toBeNull();
    });

    it('should start with SMA and then apply EMA weight', () => {
      const closes = [10, 20, 30];
      const result = ema(3, closes);
      // With only 3 values and period 3, EMA equals SMA
      expect(result).toBe(20); // (10+20+30)/3 = 20
    });
  });

  describe('emaSeries()', () => {
    it('should return array of EMA values', () => {
      const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const result = emaSeries(3, closes);
      expect(result).toHaveLength(closes.length);
      // First two should be null
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      // Rest should have values
      for (let i = 2; i < result.length; i++) {
        expect(result[i]).not.toBeNull();
        expect(result[i]).toBeGreaterThan(0);
      }
    });

    it('should return all nulls when not enough data', () => {
      const closes = [10, 20];
      const result = emaSeries(5, closes);
      expect(result).toHaveLength(2);
      expect(result.every((v) => v === null)).toBe(true);
    });
  });
});
