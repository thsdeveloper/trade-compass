import { describe, it, expect } from 'vitest';
import { sma, smaSeries } from '../../src/engine/indicators/sma.js';

describe('SMA - Simple Moving Average', () => {
  describe('sma()', () => {
    it('should calculate SMA correctly for simple values', () => {
      const closes = [10, 20, 30, 40, 50];
      const result = sma(5, closes);
      expect(result).toBe(30); // (10+20+30+40+50)/5 = 30
    });

    it('should return last N values average when array is longer', () => {
      const closes = [5, 10, 15, 20, 25, 30];
      const result = sma(3, closes);
      expect(result).toBe(25); // (20+25+30)/3 = 25
    });

    it('should return null when not enough data', () => {
      const closes = [10, 20];
      const result = sma(5, closes);
      expect(result).toBeNull();
    });

    it('should return the single value for period 1', () => {
      const closes = [10, 20, 30];
      const result = sma(1, closes);
      expect(result).toBe(30);
    });
  });

  describe('smaSeries()', () => {
    it('should return array of SMA values with nulls for early positions', () => {
      const closes = [10, 20, 30, 40, 50];
      const result = smaSeries(3, closes);
      expect(result).toHaveLength(5);
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBe(20); // (10+20+30)/3
      expect(result[3]).toBe(30); // (20+30+40)/3
      expect(result[4]).toBe(40); // (30+40+50)/3
    });

    it('should return all nulls when not enough data', () => {
      const closes = [10, 20];
      const result = smaSeries(5, closes);
      expect(result).toHaveLength(2);
      expect(result.every((v) => v === null)).toBe(true);
    });
  });
});
