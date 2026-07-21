/**
 * Rate limiter in-memory por chave (ex: userId). Mesmo padrão usado na
 * extração de nota (agent-transaction.ts): janela fixa, sem dependências.
 * Adequado para proteger rotas caras de LLM em um único processo.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string): boolean {
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now > entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  };
}
