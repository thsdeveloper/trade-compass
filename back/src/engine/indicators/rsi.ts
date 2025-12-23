/**
 * Relative Strength Index (RSI)
 * RSI = 100 - (100 / (1 + RS))
 * RS = Media de ganhos / Media de perdas
 */
export function rsi(period: number, closes: number[]): number | null {
  if (closes.length < period + 1 || period <= 0) {
    return null;
  }

  // Calcular mudancas
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Separar ganhos e perdas
  const recentChanges = changes.slice(-period);

  let gains = 0;
  let losses = 0;

  for (const change of recentChanges) {
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100; // Sem perdas = RSI maximo
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
