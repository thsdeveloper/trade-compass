import { sma } from './sma.js';

/**
 * Exponential Moving Average (EMA)
 * EMA = (Close - EMA_anterior) * k + EMA_anterior
 * k = 2 / (period + 1)
 */
export function ema(period: number, values: number[]): number | null {
  if (values.length < period || period <= 0) {
    return null;
  }

  const k = 2 / (period + 1);

  // Inicializa com SMA do primeiro periodo
  const initialSma = sma(period, values.slice(0, period));
  if (initialSma === null) return null;

  let emaValue = initialSma;

  // Calcula EMA para os valores restantes
  for (let i = period; i < values.length; i++) {
    emaValue = (values[i] - emaValue) * k + emaValue;
  }

  return emaValue;
}

/**
 * Calcula EMA para uma serie, retornando array com valores
 */
export function emaSeries(period: number, values: number[]): (number | null)[] {
  if (values.length < period || period <= 0) {
    return values.map(() => null);
  }

  const result: (number | null)[] = [];
  const k = 2 / (period + 1);

  // Preenche com null ate ter dados suficientes
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  // Primeiro valor e SMA
  const slice = values.slice(0, period);
  let emaValue = slice.reduce((acc, val) => acc + val, 0) / period;
  result.push(emaValue);

  // Calcula EMA para os valores restantes
  for (let i = period; i < values.length; i++) {
    emaValue = (values[i] - emaValue) * k + emaValue;
    result.push(emaValue);
  }

  return result;
}
