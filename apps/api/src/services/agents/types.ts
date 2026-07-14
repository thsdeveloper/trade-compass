export type AgentId = 'financeiro' | 'investimentos';

export interface AgentDefinition {
  id: AgentId;
  /** Nome exibido nas UIs */
  name: string;
  description: string;
  /** Prompt de sistema; deve conter o placeholder {context} */
  systemPrompt: string;
  /** Retorna o contexto do domínio já formatado para o prompt */
  getContext(userId: string, accessToken: string): Promise<string>;
  /** Override do modelo; default OPENAI_MODEL */
  model?: string;
  maxTokens: number;
  temperature?: number;
}
