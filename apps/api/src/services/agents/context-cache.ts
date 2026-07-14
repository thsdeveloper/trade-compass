/**
 * Cache TTL em memória para o contexto formatado dos agentes.
 *
 * Numa conversa, cada mensagem dispara a montagem do contexto (~10 queries no
 * caso do agente financeiro). Os dados não mudam em segundos, então um TTL
 * curto elimina o retrabalho sem risco relevante de resposta desatualizada.
 */
const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 500;

interface Entry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

export async function getContextCached(
  key: string,
  loader: () => Promise<string>
): Promise<string> {
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const value = await loader();

  if (cache.size >= MAX_ENTRIES) {
    for (const [k, entry] of cache) {
      if (entry.expiresAt <= now) {
        cache.delete(k);
      }
    }
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }
  }

  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

export function clearContextCache(): void {
  cache.clear();
}
