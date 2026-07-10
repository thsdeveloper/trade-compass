import { describe, it, expect } from 'vitest';
import { avgVolume, volumeRatio } from '../../src/engine/indicators/volume.js';
import type { Candle } from '../../src/domain/types.js';

function makeCandle(volume: number): Candle {
  return {
    time: '2024-01-01',
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume,
  };
}

describe('Volume Indicators', () => {
  describe('avgVolume()', () => {
    it('should calculate average volume correctly', () => {
      const candles = [
        makeCandle(1000),
        makeCandle(2000),
        makeCandle(3000),
        makeCandle(4000),
        makeCandle(5000),
      ];
      const result = avgVolume(5, candles);
      expect(result).toBe(3000); // (1000+2000+3000+4000+5000)/5
    });

    it('should use last N candles', () => {
      const candles = [
        makeCandle(1000),
        makeCandle(2000),
        makeCandle(3000),
        makeCandle(4000),
        makeCandle(5000),
      ];
      const result = avgVolume(3, candles);
      expect(result).toBe(4000); // (3000+4000+5000)/3
    });

    it('should return null when not enough data', () => {
      const candles = [makeCandle(1000), makeCandle(2000)];
      const result = avgVolume(5, candles);
      expect(result).toBeNull();
    });
  });

  describe('volumeRatio()', () => {
    it('should calculate volume ratio correctly', () => {
      const candles = [
        makeCandle(1000),
        makeCandle(1000),
        makeCandle(1000),
        makeCandle(1000),
        makeCandle(2000), // Current: 2x average
      ];
      const result = volumeRatio(4, candles);
      expect(result).toBe(2); // 2000 / 1000 = 2
    });

    it('should return null when average is 0', () => {
      const candles = [
        makeCandle(0),
        makeCandle(0),
        makeCandle(0),
        makeCandle(0),
        makeCandle(1000),
      ];
      const result = volumeRatio(4, candles);
      expect(result).toBeNull();
    });
  });
});
