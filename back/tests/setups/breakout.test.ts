import { describe, it, expect } from 'vitest';
import { detectBreakout } from '../../src/engine/setups/breakout.js';
import type { Candle, VolatilityLevel } from '../../src/domain/types.js';

function makeCandle(
  time: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): Candle {
  return { time, open, high, low, close, volume };
}

function makeCandlesWithResistance(resistanceLevel: number, currentClose: number, currentVolume: number): Candle[] {
  const candles: Candle[] = [];

  // Create 25 candles with a clear resistance
  for (let i = 0; i < 24; i++) {
    const basePrice = resistanceLevel - 5;
    candles.push(makeCandle(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      basePrice,
      i === 10 ? resistanceLevel : basePrice + 2, // One candle hits resistance
      basePrice - 1,
      basePrice + 1,
      1000000
    ));
  }

  // Current candle
  candles.push(makeCandle(
    '2024-01-25',
    currentClose - 0.5,
    currentClose + 1,
    currentClose - 1,
    currentClose,
    currentVolume
  ));

  return candles;
}

describe('Breakout Setup', () => {
  describe('detectBreakout()', () => {
    it('should detect ATIVO when price breaks resistance with volume', () => {
      const resistance = 100;
      const candles = makeCandlesWithResistance(resistance, 102, 1500000); // Above resistance, high volume
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakout('TEST', candles, volatility, 65);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('ATIVO');
      expect(result?.title).toBe('Rompimento de Resistencia');
    });

    it('should detect EM_FORMACAO when price is near resistance', () => {
      const resistance = 100;
      const candles = makeCandlesWithResistance(resistance, 99.6, 1000000); // Near but below resistance
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakout('TEST', candles, volatility, 65);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('EM_FORMACAO');
    });

    it('should return INVALIDO status when price is far from resistance', () => {
      const resistance = 100;
      const candles = makeCandlesWithResistance(resistance, 90, 1000000); // Far below resistance
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakout('TEST', candles, volatility, 65);

      // It returns a result but with INVALIDO status
      expect(result).not.toBeNull();
      expect(result?.status).toBe('INVALIDO');
    });

    it('should include meta information with correct keys', () => {
      const candles = makeCandlesWithResistance(100, 102, 1500000);
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakout('TEST', candles, volatility, 65);

      expect(result?.meta).toHaveProperty('resistance');
      expect(result?.meta).toHaveProperty('atr');
      expect(result?.meta).toHaveProperty('volumeRatio');
      expect(result?.meta).toHaveProperty('currentClose');
      expect(result?.meta).toHaveProperty('stopLevel');
    });

    it('should determine risk based on volatility', () => {
      const candles = makeCandlesWithResistance(100, 102, 1500000);

      const resultLow = detectBreakout('TEST', candles, 'Baixa', 65);
      const resultMed = detectBreakout('TEST', candles, 'Media', 65);
      const resultHigh = detectBreakout('TEST', candles, 'Alta', 65);

      expect(resultLow?.risk).toBe('Baixo');
      expect(resultMed?.risk).toBe('Moderado');
      expect(resultHigh?.risk).toBe('Alto');
    });

    it('should include successRate in result', () => {
      const candles = makeCandlesWithResistance(100, 102, 1500000);
      const result = detectBreakout('TEST', candles, 'Media', 72);

      expect(result?.successRate).toBe(72);
    });
  });
});
