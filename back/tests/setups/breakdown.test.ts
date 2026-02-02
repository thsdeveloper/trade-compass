import { describe, it, expect } from 'vitest';
import { detectBreakdown } from '../../src/engine/setups/breakdown.js';
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

function makeCandlesWithSupport(supportLevel: number, currentClose: number, currentVolume: number): Candle[] {
  const candles: Candle[] = [];

  // Create 25 candles with a clear support
  // Implementaç~cao
  for (let i = 0; i < 24; i++) {
    const basePrice = supportLevel + 5;
    candles.push(makeCandle(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      basePrice,
      basePrice + 1,
      i === 10 ? supportLevel : basePrice - 2, // One candle hits support
      basePrice - 1,
      1000000
    ));
  }

  // Current candle
  candles.push(makeCandle(
    '2024-01-25',
    currentClose + 0.5,
    currentClose + 1,
    currentClose - 1,
    currentClose,
    currentVolume
  ));

  return candles;
}

describe('Breakdown Setup', () => {
  describe('detectBreakdown()', () => {
    it('should detect ATIVO when price breaks support with volume', () => {
      const support = 100;
      const candles = makeCandlesWithSupport(support, 98, 1500000); // Below support, high volume
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakdown('TEST', candles, volatility, 55);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('ATIVO');
      expect(result?.title).toBe('Quebra de Suporte');
    });

    it('should detect EM_FORMACAO when price is near support', () => {
      const support = 100;
      const candles = makeCandlesWithSupport(support, 100.4, 1000000); // Near but above support
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakdown('TEST', candles, volatility, 55);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('EM_FORMACAO');
    });

    it('should return INVALIDO status when price is far above support', () => {
      const support = 100;
      const candles = makeCandlesWithSupport(support, 110, 1000000); // Far above support
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakdown('TEST', candles, volatility, 55);

      // Returns result with INVALIDO status
      expect(result).not.toBeNull();
      expect(result?.status).toBe('INVALIDO');
    });

    it('should have Moderado or Alto risk (never Baixo)', () => {
      const candles = makeCandlesWithSupport(100, 98, 1500000);

      const resultMed = detectBreakdown('TEST', candles, 'Media', 55);
      const resultLow = detectBreakdown('TEST', candles, 'Baixa', 55);
      const resultHigh = detectBreakdown('TEST', candles, 'Alta', 55);

      expect(resultLow?.risk).toBe('Moderado'); // Breakdown never has Baixo risk
      expect(resultMed?.risk).toBe('Moderado');
      expect(resultHigh?.risk).toBe('Alto');
    });

    it('should include ATENCAO in explanation when ATIVO', () => {
      const candles = makeCandlesWithSupport(100, 98, 1500000);
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakdown('TEST', candles, volatility, 55);

      expect(result?.explanation).toContain('ATENCAO');
    });

    it('should include meta information', () => {
      const candles = makeCandlesWithSupport(100, 98, 1500000);
      const volatility: VolatilityLevel = 'Media';

      const result = detectBreakdown('TEST', candles, volatility, 55);

      expect(result?.meta).toHaveProperty('support');
      expect(result?.meta).toHaveProperty('atr');
      expect(result?.meta).toHaveProperty('volumeRatio');
      expect(result?.meta).toHaveProperty('currentClose');
    });
  });
});
