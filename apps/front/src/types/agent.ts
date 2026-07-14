export type AgentId = 'financeiro' | 'investimentos';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AgentSuggestion {
  label: string;
  prompt: string;
}

export interface AgentInfo {
  id: AgentId;
  label: string;
  description: string;
  suggestions: AgentSuggestion[];
}

export const AGENTS: Record<AgentId, AgentInfo> = {
  financeiro: {
    id: 'financeiro',
    label: 'Norte',
    description: 'Seu norte financeiro — saldo, contas, cartoes, metas e dividas',
    suggestions: [
      { label: 'Qual meu saldo total?', prompt: 'Qual e meu saldo total em todas as contas?' },
      { label: 'Proximos vencimentos', prompt: 'Quais contas vencem nos proximos dias?' },
      { label: 'Resumo do mes', prompt: 'Me de um resumo das minhas financas deste mes' },
      { label: 'Como estao meus objetivos?', prompt: 'Como esta o progresso dos meus objetivos financeiros?' },
    ],
  },
  investimentos: {
    id: 'investimentos',
    label: 'Polaris',
    description: 'Sua estrela-guia de investimentos — renda fixa, rentabilidade e vencimentos',
    suggestions: [
      { label: 'Resumo da carteira', prompt: 'Me de um resumo da minha carteira de investimentos' },
      { label: 'Rentabilidade', prompt: 'Qual a rentabilidade estimada dos meus investimentos?' },
      { label: 'Proximos vencimentos', prompt: 'Quais investimentos vencem nos proximos 90 dias?' },
      { label: 'Minha watchlist', prompt: 'Quais ativos estou acompanhando na watchlist?' },
    ],
  },
};

export const DEFAULT_AGENT_ID: AgentId = 'financeiro';

export interface AgentContextType {
  isOpen: boolean;
  activeAgentId: AgentId;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  setActiveAgent: (id: AgentId) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}
