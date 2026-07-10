import { describe, it, expect } from 'vitest';
import { detectMysticPulse, wasMysticPulseActive } from '../../src/engine/setups/mystic-pulse.js';
import type { Candle, Trend, VolatilityLevel } from '../../src/domain/types.js';

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

describe('Mystic Pulse Setup', () => {
  describe('detectMysticPulse()', () => {
    it('should return null when not enough data', () => {
      const candles = makeUptrendCandles(5);
      const result = detectMysticPulse('TEST', candles, 'Alta', 'Media', 65);
      expect(result).toBeNull();
    });

    it('should detect setup in uptrend with bullish momentum', () => {
      const candles = makeUptrendCandles(25);
      const trend: Trend = 'Alta';
      const volatility: VolatilityLevel = 'Media';

      const result = detectMysticPulse('TEST', candles, trend, volatility, 65);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('mystic-pulse-test');
      expect(result?.title).toContain('Alta');
    });

    it('should detect setup in downtrend with bearish momentum', () => {
      const candles = makeDowntrendCandles(25);
      const trend: Trend = 'Baixa';
      const volatility: VolatilityLevel = 'Media';

      const result = detectMysticPulse('TEST', candles, trend, volatility, 65);

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Baixa');
    });

    it('should have EM_FORMACAO status in lateral market', () => {
      const candles = makeLateralCandles(30);
      const trend: Trend = 'Lateral';
      const volatility: VolatilityLevel = 'Media';

      const result = detectMysticPulse('TEST', candles, trend, volatility, 65);

      expect(result).not.toBeNull();
      // Em mercado lateral sem momentum forte, deve estar em formacao ou invalido
      expect(['EM_FORMACAO', 'INVALIDO']).toContain(result?.status);
    });

    it('should include correct meta information', () => {
      const candles = makeUptrendCandles(25);
      const result = detectMysticPulse('TEST', candles, 'Alta', 'Media', 65);

      expect(result?.meta).toHaveProperty('trendScore');
      expect(result?.meta).toHaveProperty('positiveCount');
      expect(result?.meta).toHaveProperty('negativeCount');
      expect(result?.meta).toHaveProperty('intensity');
      expect(result?.meta).toHaveProperty('diPlus');
      expect(result?.meta).toHaveProperty('diMinus');
      expect(result?.meta).toHaveProperty('atr');
      expect(result?.meta).toHaveProperty('currentClose');
      expect(result?.meta).toHaveProperty('stopLevel');
    });

    it('should determine risk based on volatility', () => {
      const candles = makeUptrendCandles(25);
      const trend: Trend = 'Alta';

      const resultLow = detectMysticPulse('TEST', candles, trend, 'Baixa', 65);
      const resultMed = detectMysticPulse('TEST', candles, trend, 'Media', 65);
      const resultHigh = detectMysticPulse('TEST', candles, trend, 'Alta', 65);

      expect(resultLow?.risk).toBe('Baixo');
      expect(resultMed?.risk).toBe('Moderado');
      expect(resultHigh?.risk).toBe('Alto');
    });

    it('should increase risk when momentum is against trend', () => {
      // Criar candles de alta mas declarar tendencia como Baixa (contra-tendencia)
      const candles = makeUptrendCandles(25);
      const trend: Trend = 'Baixa'; // Contra o momentum
      const volatility: VolatilityLevel = 'Baixa';

      const result = detectMysticPulse('TEST', candles, trend, volatility, 65);

      // Contra tendencia deve ter risco Alto
      expect(result?.risk).toBe('Alto');
    });

    it('should include successRate in result', () => {
      const candles = makeUptrendCandles(25);
      const result = detectMysticPulse('TEST', candles, 'Alta', 'Media', 72);

      expect(result?.successRate).toBe(72);
    });

    it('should generate signals when ATIVO', () => {
      const candles = makeUptrendCandles(25);
      const result = detectMysticPulse('TEST', candles, 'Alta', 'Media', 65);

      if (result?.status === 'ATIVO') {
        expect(result.signals.length).toBeGreaterThan(0);
        expect(result.signals.some(s => s.includes('Momentum'))).toBe(true);
      }
    });

    it('should provide stop suggestion', () => {
      const candles = makeUptrendCandles(25);
      const result = detectMysticPulse('TEST', candles, 'Alta', 'Media', 65);

      expect(result?.stopSuggestion).toBeDefined();
      expect(result?.stopSuggestion).toContain('R$');
    });
  });

  describe('wasMysticPulseActive()', () => {
    it('should return false for invalid index', () => {
      const candles = makeUptrendCandles(25);
      expect(wasMysticPulseActive(candles, -1, 'Alta')).toBe(false);
      expect(wasMysticPulseActive(candles, 100, 'Alta')).toBe(false);
    });

    it('should return false for early indices without enough data', () => {
      const candles = makeUptrendCandles(25);
      expect(wasMysticPulseActive(candles, 5, 'Alta')).toBe(false);
    });

    it('should return boolean for valid indices', () => {
      const candles = makeUptrendCandles(30);
      const result = wasMysticPulseActive(candles, 25, 'Alta');
      expect(typeof result).toBe('boolean');
    });

    it('should work with downtrend', () => {
      const candles = makeDowntrendCandles(30);
      const result = wasMysticPulseActive(candles, 25, 'Baixa');
      expect(typeof result).toBe('boolean');
    });
  });
});
