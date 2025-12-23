import { describe, it, expect } from 'vitest';
import { calculateDecisionZone } from '../src/engine/decision-zone.js';
import type { Context, SetupResult } from '../src/domain/types.js';

function makeSetup(overrides: Partial<SetupResult>): SetupResult {
  return {
    id: 'test-setup',
    title: 'Test Setup',
    status: 'ATIVO',
    successRate: 60,
    risk: 'Moderado',
    stopSuggestion: 'R$ 95.00',
    targetNote: 'Meta baseada em dados historicos',
    explanation: 'Explicacao do setup',
    signals: ['Sinal 1'],
    meta: {},
    ...overrides,
  };
}

describe('Decision Zone Aggregator', () => {
  describe('calculateDecisionZone()', () => {
    it('should return RISCO when Breakdown is ATIVO', () => {
      const context: Context = {
        trend: 'Baixa',
        volume: 'Acima',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [
        makeSetup({ id: 'breakdown-test', title: 'Quebra de Suporte', status: 'ATIVO' }),
      ];

      const result = calculateDecisionZone({ context, setups });

      expect(result.zone).toBe('RISCO');
      expect(result.reasons).toContain('Quebra de suporte detectada');
    });

    it('should return FAVORAVEL when Breakout is ATIVO with Alta trend and Acima volume', () => {
      const context: Context = {
        trend: 'Alta',
        volume: 'Acima',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [
        makeSetup({ id: 'breakout-test', title: 'Rompimento de Resistencia', status: 'ATIVO' }),
      ];

      const result = calculateDecisionZone({ context, setups });

      expect(result.zone).toBe('FAVORAVEL');
      expect(result.reasons).toContain('Rompimento de resistencia confirmado');
    });

    it('should return FAVORAVEL when Pullback is ATIVO with Alta trend', () => {
      const context: Context = {
        trend: 'Alta',
        volume: 'Normal',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [
        makeSetup({ id: 'pullback-sma20-test', title: 'Pullback na SMA20', status: 'ATIVO' }),
      ];

      const result = calculateDecisionZone({ context, setups });

      expect(result.zone).toBe('FAVORAVEL');
      expect(result.reasons).toContain('Pullback em tendencia de alta');
    });

    it('should return NEUTRA when volatility is Alta and no active setups', () => {
      const context: Context = {
        trend: 'Lateral',
        volume: 'Normal',
        volatility: 'Alta',
      };
      const setups: SetupResult[] = [];

      const result = calculateDecisionZone({ context, setups });

      expect(result.zone).toBe('NEUTRA');
      expect(result.reasons).toContain('Volatilidade elevada');
    });

    it('should return NEUTRA by default', () => {
      const context: Context = {
        trend: 'Lateral',
        volume: 'Normal',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [];

      const result = calculateDecisionZone({ context, setups });

      expect(result.zone).toBe('NEUTRA');
    });

    it('should prioritize RISCO over FAVORAVEL', () => {
      const context: Context = {
        trend: 'Alta',
        volume: 'Acima',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [
        makeSetup({ id: 'breakout-test', title: 'Rompimento de Resistencia', status: 'ATIVO' }),
        makeSetup({ id: 'breakdown-test', title: 'Quebra de Suporte', status: 'ATIVO' }),
      ];

      const result = calculateDecisionZone({ context, setups });

      // RISCO should take priority
      expect(result.zone).toBe('RISCO');
    });

    it('should include message in result', () => {
      const context: Context = {
        trend: 'Lateral',
        volume: 'Normal',
        volatility: 'Media',
      };

      const result = calculateDecisionZone({ context, setups: [] });

      expect(result.message).toBeTruthy();
      expect(typeof result.message).toBe('string');
    });

    it('should ignore EM_FORMACAO setups for zone determination', () => {
      const context: Context = {
        trend: 'Alta',
        volume: 'Acima',
        volatility: 'Media',
      };
      const setups: SetupResult[] = [
        makeSetup({ id: 'breakout-test', title: 'Rompimento de Resistencia', status: 'EM_FORMACAO' }),
      ];

      const result = calculateDecisionZone({ context, setups });

      // Should be NEUTRA since no ATIVO setup (breakout requires ATIVO to trigger FAVORAVEL)
      expect(result.zone).toBe('NEUTRA');
    });
  });
});
