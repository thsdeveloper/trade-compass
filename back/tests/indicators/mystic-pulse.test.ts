import { describe, it, expect } from 'vitest';
import { mysticPulse, mysticPulseSeries } from '../../src/engine/indicators/mystic-pulse.js';
import type { Candle } from '../../src/domain/types.js';

function makeCandle(
  time: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 1000000
): Candle {
  return { time, open, high, low, close, volume };
}

function makeUptrendCandles(count: number, startPrice = 100): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const price = startPrice + i * 2;
    candles.push(makeCandle(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      price,
      price + 1.5,
      price - 0.5,
      price + 1,
      1000000
    ));
  }
  return candles;
}

function makeDowntrendCandles(count: number, startPrice = 150): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const price = startPrice - i * 2;
    candles.push(makeCandle(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      price,
      price + 0.5,
      price - 1.5,
      price - 1,
      1000000
    ));
  }
  return candles;
}

function makeLateralCandles(count: number, basePrice = 100): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    // Oscila entre -1 e +1 em relacao ao preco base
    const variation = (i % 2 === 0) ? 0.5 : -0.5;
    candles.push(makeCandle(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      basePrice + variation,
      basePrice + 1,
      basePrice - 1,
      basePrice - variation,
      1000000
    ));
  }
  return candles;
}

describe('Mystic Pulse Indicator', () => {
  describe('mysticPulse()', () => {
    it('should return null when not enough data', () => {
      const candles = makeUptrendCandles(5);
      const result = mysticPulse(candles);
      expect(result).toBeNull();
    });

    it('should detect bullish momentum in uptrend', () => {
      const candles = makeUptrendCandles(20);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result?.isBullish).toBe(true);
      expect(result?.positiveCount).toBeGreaterThan(0);
      expect(result?.trendScore).toBeGreaterThan(0);
    });

    it('should detect bearish momentum in downtrend', () => {
      const candles = makeDowntrendCandles(20);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result?.isBullish).toBe(false);
      expect(result?.negativeCount).toBeGreaterThan(0);
      expect(result?.trendScore).toBeLessThan(0);
    });

    it('should have near-zero score in lateral market', () => {
      const candles = makeLateralCandles(30);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      // Em mercado lateral, o score deve ser baixo (proximo de zero)
      expect(Math.abs(result?.trendScore ?? 0)).toBeLessThan(5);
    });

    it('should return DI+ and DI- values', () => {
      const candles = makeUptrendCandles(20);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result?.diPlus).toBeDefined();
      expect(result?.diMinus).toBeDefined();
      expect(result?.diPlus).toBeGreaterThanOrEqual(0);
      expect(result?.diMinus).toBeGreaterThanOrEqual(0);
    });

    it('should return intensity between 0 and 1', () => {
      const candles = makeUptrendCandles(25);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result?.intensity).toBeGreaterThanOrEqual(0);
      expect(result?.intensity).toBeLessThanOrEqual(1);
    });

    it('should have higher DI+ than DI- in uptrend', () => {
      const candles = makeUptrendCandles(20);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result!.diPlus).toBeGreaterThan(result!.diMinus);
    });

    it('should have higher DI- than DI+ in downtrend', () => {
      const candles = makeDowntrendCandles(20);
      const result = mysticPulse(candles);

      expect(result).not.toBeNull();
      expect(result!.diMinus).toBeGreaterThan(result!.diPlus);
    });
  });

  describe('mysticPulseSeries()', () => {
    it('should return array of same length as input', () => {
      const candles = makeUptrendCandles(15);
      const result = mysticPulseSeries(candles);

      expect(result).toHaveLength(15);
    });

    it('should return nulls for early positions', () => {
      const candles = makeUptrendCandles(15);
      const result = mysticPulseSeries(candles);

      // Primeiros candles devem ser null (nao tem dados suficientes)
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
    });

    it('should return valid results after warmup period', () => {
      const candles = makeUptrendCandles(20);
      const result = mysticPulseSeries(candles);

      // Apos periodo de aquecimento, deve ter resultados validos
      const validResults = result.filter(r => r !== null);
      expect(validResults.length).toBeGreaterThan(0);
    });
  });

  describe('custom parameters', () => {
    it('should accept custom adxLength', () => {
      const candles = makeUptrendCandles(25);
      const resultDefault = mysticPulse(candles, 9);
      const resultCustom = mysticPulse(candles, 14);

      expect(resultDefault).not.toBeNull();
      expect(resultCustom).not.toBeNull();
      // Diferentes periodos devem produzir resultados diferentes
      expect(resultDefault?.trendScore).not.toBe(resultCustom?.trendScore);
    });

    it('should accept custom collectLength for normalization', () => {
      const candles = makeUptrendCandles(150);
      const result50 = mysticPulse(candles, 9, 50);
      const result100 = mysticPulse(candles, 9, 100);

      expect(result50).not.toBeNull();
      expect(result100).not.toBeNull();
      // Intensidades podem variar com diferentes janelas de normalizacao
    });

    it('should accept custom gamma for intensity calculation', () => {
      const candles = makeUptrendCandles(25);
      const resultLowGamma = mysticPulse(candles, 9, 100, 0.5);
      const resultHighGamma = mysticPulse(candles, 9, 100, 1.5);

      expect(resultLowGamma).not.toBeNull();
      expect(resultHighGamma).not.toBeNull();
      // Diferentes gammas afetam a curva de intensidade
    });
  });
});
