import type { Candle, SetupResult, SetupStatus, RiskLevel, VolatilityLevel } from '../../domain/types.js';
import {
  BREAKDOWN_LOOKBACK,
  BREAKDOWN_PROXIMITY,
  BREAKDOWN_VOLUME_MULTIPLIER,
  ATR_PERIOD,
} from '../../domain/constants.js';
import { atr } from '../indicators/atr.js';
import { avgVolume, volumeRatio } from '../indicators/volume.js';

interface BreakdownAnalysis {
  support: number;
  currentClose: number;
  currentVolume: number;
  avgVolumeValue: number;
  volumeRatioValue: number;
  atrValue: number;
  status: SetupStatus;
}

/**
 * Analisa se ha breakdown de suporte
 * Suporte = minima dos ultimos N candles (exceto o atual)
 */
function analyzeBreakdown(candles: Candle[]): BreakdownAnalysis | null {
  if (candles.length < BREAKDOWN_LOOKBACK + 1) {
    return null;
  }

  const currentCandle = candles[candles.length - 1];
  const lookbackCandles = candles.slice(-BREAKDOWN_LOOKBACK - 1, -1);

  // Calcular suporte (minima do periodo)
  const support = Math.min(...lookbackCandles.map((c) => c.low));

  // Valores atuais
  const currentClose = currentCandle.close;
  const currentVolume = currentCandle.volume;

  // Indicadores
  const avgVol = avgVolume(BREAKDOWN_LOOKBACK, candles.slice(0, -1));
  const volRatio = volumeRatio(BREAKDOWN_LOOKBACK, candles);
  const atrValue = atr(ATR_PERIOD, candles);

  if (avgVol === null || atrValue === null) {
    return null;
  }

  // Determinar status
  let status: SetupStatus = 'INVALIDO';

  // ATIVO: rompeu suporte para baixo com volume
  if (currentClose < support && (volRatio ?? 0) > BREAKDOWN_VOLUME_MULTIPLIER) {
    status = 'ATIVO';
  }
  // EM_FORMACAO: proximo do suporte
  else if (currentClose <= support * BREAKDOWN_PROXIMITY) {
    status = 'EM_FORMACAO';
  }

  return {
    support,
    currentClose,
    currentVolume,
    avgVolumeValue: avgVol,
    volumeRatioValue: volRatio ?? 0,
    atrValue,
    status,
  };
}

/**
 * Breakdown sempre tem risco alto ou moderado
 */
function determineRisk(volatility: VolatilityLevel): RiskLevel {
  // Breakdown e um sinal de risco, entao nunca e "Baixo"
  return volatility === 'Alta' ? 'Alto' : 'Moderado';
}

/**
 * Detecta setup de Breakdown (Quebra de Suporte)
 * Este setup indica RISCO - nao e uma oportunidade de compra
 */
export function detectBreakdown(
  ticker: string,
  candles: Candle[],
  volatility: VolatilityLevel,
  successRate: number
): SetupResult | null {
  const analysis = analyzeBreakdown(candles);

  if (!analysis) {
    return null;
  }

  const { support, currentClose, atrValue, volumeRatioValue, status } = analysis;

  // Nivel de invalidacao (acima do suporte)
  const invalidationLevel = support + 0.5 * atrValue;

  // Signals
  const signals: string[] = [];
  if (status === 'ATIVO') {
    signals.push('Rompimento de suporte confirmado');
    signals.push('ALERTA: Momento de cautela');
    if (volumeRatioValue > BREAKDOWN_VOLUME_MULTIPLIER) {
      signals.push(`Volume ${volumeRatioValue.toFixed(1)}x acima da media`);
    }
  } else if (status === 'EM_FORMACAO') {
    signals.push('Preco testando suporte');
    signals.push('Atencao ao risco de rompimento');
  }

  // Explanation
  let explanation = '';
  if (status === 'ATIVO') {
    explanation =
      `ATENCAO: Preco rompeu o suporte em R$ ${support.toFixed(2)} com volume ` +
      `${volumeRatioValue.toFixed(1)}x acima da media. Historicamente, ` +
      `rompimentos de suporte com volume indicam continuidade do movimento de queda. ` +
      `Momento de cautela e protecao de capital.`;
  } else if (status === 'EM_FORMACAO') {
    explanation =
      `Preco testando suporte em R$ ${support.toFixed(2)}. ` +
      `Rompimento com volume pode indicar aceleracao da queda. Momento de atencao.`;
  } else {
    explanation = `Preco acima do suporte em R$ ${support.toFixed(2)}. Sem sinal de breakdown.`;
  }

  return {
    id: `breakdown-${ticker.toLowerCase()}`,
    title: 'Quebra de Suporte',
    status,
    successRate,
    risk: determineRisk(volatility),
    stopSuggestion:
      status === 'ATIVO'
        ? `Invalidacao do setup: acima de R$ ${invalidationLevel.toFixed(2)}`
        : `Suporte em R$ ${support.toFixed(2)}. Perda pode acelerar queda.`,
    targetNote:
      `Este e um sinal de RISCO, nao de oportunidade. ` +
      `Taxa de continuidade de queda: ${successRate}% historicamente.`,
    explanation,
    signals,
    meta: {
      support: Math.round(support * 100) / 100,
      currentClose: Math.round(currentClose * 100) / 100,
      atr: Math.round(atrValue * 100) / 100,
      volumeRatio: Math.round(volumeRatioValue * 100) / 100,
      invalidationLevel: Math.round(invalidationLevel * 100) / 100,
    },
  };
}

/**
 * Verifica se o setup estava ativo em um momento historico
 */
export function wasBreakdownActive(candles: Candle[], index: number): boolean {
  if (index < BREAKDOWN_LOOKBACK + 1 || index >= candles.length) {
    return false;
  }

  const slicedCandles = candles.slice(0, index + 1);
  const analysis = analyzeBreakdown(slicedCandles);

  return analysis?.status === 'ATIVO';
}
