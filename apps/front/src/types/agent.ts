export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AgentState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface AgentContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

export const QUICK_SUGGESTIONS = [
  { label: 'Qual meu saldo total?', prompt: 'Qual e meu saldo total em todas as contas?' },
  { label: 'Proximos vencimentos', prompt: 'Quais contas vencem nos proximos dias?' },
  { label: 'Resumo do mes', prompt: 'Me de um resumo das minhas financas deste mes' },
  { label: 'Como estao meus objetivos?', prompt: 'Como esta o progresso dos meus objetivos financeiros?' },
];
