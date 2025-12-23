/**
 * Simple Moving Average (SMA)
 * Calcula a media aritmetica dos ultimos N valores
 */
export function sma(period: number, values: number[]): number | null {
  if (values.length < period || period <= 0) {
    return null;
  }

  const slice = values.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);

  return sum / period;
}

/**
 * Calcula SMA para uma serie, retornando array com valores
 * Posicoes antes do periodo terao null
 */
export function smaSeries(period: number, values: number[]): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
  }

  return result;
}
