import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAgentDefinition,
  listAgents,
  DEFAULT_AGENT_ID,
} from '../src/services/agents/registry.js';
import {
  getContextCached,
  clearContextCache,
} from '../src/services/agents/context-cache.js';

describe('agent registry', () => {
  it('resolve os agentes registrados', () => {
    expect(getAgentDefinition('financeiro')?.id).toBe('financeiro');
    expect(getAgentDefinition('investimentos')?.id).toBe('investimentos');
  });

  it('retorna undefined para agente desconhecido', () => {
    expect(getAgentDefinition('inexistente')).toBeUndefined();
    expect(getAgentDefinition('')).toBeUndefined();
  });

  it('tem o financeiro como agente padrao', () => {
    expect(DEFAULT_AGENT_ID).toBe('financeiro');
    expect(getAgentDefinition(DEFAULT_AGENT_ID)).toBeDefined();
  });

  it('lista todos os agentes com metadados', () => {
    const agents = listAgents();
    expect(agents).toHaveLength(2);
    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.description).toBeTruthy();
    }
  });

  it('todo agente tem o placeholder {context} no system prompt', () => {
    for (const { id } of listAgents()) {
      const def = getAgentDefinition(id)!;
      expect(def.systemPrompt).toContain('{context}');
      expect(def.maxTokens).toBeGreaterThan(0);
    }
  });
});

describe('context cache', () => {
  beforeEach(() => {
    clearContextCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reusa o contexto dentro do TTL', async () => {
    const loader = vi.fn().mockResolvedValue('contexto');

    expect(await getContextCached('financeiro:user-1', loader)).toBe('contexto');
    expect(await getContextCached('financeiro:user-1', loader)).toBe('contexto');

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('refaz a carga apos o TTL expirar', async () => {
    const loader = vi.fn().mockResolvedValue('contexto');

    await getContextCached('financeiro:user-1', loader);
    vi.advanceTimersByTime(61 * 1000);
    await getContextCached('financeiro:user-1', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('nao mistura contexto entre usuarios ou agentes', async () => {
    const loaderA = vi.fn().mockResolvedValue('contexto A');
    const loaderB = vi.fn().mockResolvedValue('contexto B');

    expect(await getContextCached('financeiro:user-1', loaderA)).toBe('contexto A');
    expect(await getContextCached('investimentos:user-1', loaderB)).toBe('contexto B');

    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });
});
