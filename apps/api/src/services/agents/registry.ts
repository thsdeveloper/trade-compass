import { financeiroAgent } from './financeiro.js';
import { investimentosAgent } from './investimentos.js';
import type { AgentDefinition, AgentId } from './types.js';

const registry: Record<AgentId, AgentDefinition> = {
  financeiro: financeiroAgent,
  investimentos: investimentosAgent,
};

export const DEFAULT_AGENT_ID: AgentId = 'financeiro';

export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return registry[id as AgentId];
}

export function listAgents(): Array<Pick<AgentDefinition, 'id' | 'name' | 'description'>> {
  return Object.values(registry).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}
