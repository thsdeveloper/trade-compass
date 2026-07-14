'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  AGENTS,
  DEFAULT_AGENT_ID,
  type AgentId,
  type ChatMessage,
  type AgentContextType,
  type StreamChunk,
} from '@/types/agent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Janela de histórico enviada por request. O backend aceita até 20 mensagens;
// enviar menos controla o custo de tokens sem perda prática (o contexto do
// domínio é injetado no system prompt a cada chamada).
const MAX_HISTORY_MESSAGES = 12;

const AgentContext = createContext<AgentContextType | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function emptyConversations(): Record<AgentId, ChatMessage[]> {
  return { financeiro: [], investimentos: [] };
}

/** Deriva o agente pela seção do app em que o usuário está */
function agentIdFromPathname(pathname: string | null): AgentId {
  if (!pathname) return DEFAULT_AGENT_ID;
  if (pathname.startsWith('/investimentos') || pathname.startsWith('/asset')) {
    return 'investimentos';
  }
  return DEFAULT_AGENT_ID;
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>(DEFAULT_AGENT_ID);
  const [conversations, setConversations] = useState<Record<AgentId, ChatMessage[]>>(
    emptyConversations
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = conversations[activeAgentId];

  const openChat = useCallback(() => {
    // Ao abrir, seleciona o agente da seção atual (telas de investimentos
    // abrem o Analista de Carteira). As conversas de cada agente são mantidas.
    setActiveAgentId(agentIdFromPathname(pathname));
    setIsOpen(true);
    setError(null);
  }, [pathname]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setActiveAgent = useCallback(
    (id: AgentId) => {
      if (isLoading) return;
      setActiveAgentId(id);
      setError(null);
    },
    [isLoading]
  );

  const clearMessages = useCallback(() => {
    setConversations((prev) => ({ ...prev, [activeAgentId]: [] }));
    setError(null);
  }, [activeAgentId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session?.access_token) {
        setError('Voce precisa estar logado para usar o assistente.');
        return;
      }

      if (!content.trim() || isLoading) {
        return;
      }

      const agentId = activeAgentId;

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      // Create placeholder for assistant message
      const assistantMessageId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      const history = conversations[agentId];

      setConversations((prev) => ({
        ...prev,
        [agentId]: [...prev[agentId], userMessage, assistantMessage],
      }));

      const updateAssistant = (patch: Partial<ChatMessage>) => {
        setConversations((prev) => ({
          ...prev,
          [agentId]: prev[agentId].map((m) =>
            m.id === assistantMessageId ? { ...m, ...patch } : m
          ),
        }));
      };

      try {
        // Prepare messages for API (janela limitada, sem ids e timestamps)
        const apiMessages = [...history, userMessage]
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const response = await fetch(
          `${API_BASE_URL}/api/agent/${agentId}/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ messages: apiMessages }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamChunk = JSON.parse(line.substring(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.content) {
                  fullContent += data.content;
                  updateAssistant({ content: fullContent });
                }

                if (data.done) {
                  updateAssistant({ isStreaming: false });
                }
              } catch (parseError) {
                console.error('Error parsing SSE chunk:', parseError);
              }
            }
          }
        }

        // Mark as done if not already
        updateAssistant({ isStreaming: false });
      } catch (err) {
        console.error('Agent error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao enviar mensagem';
        setError(errorMessage);

        // Remove the empty assistant message on error
        setConversations((prev) => ({
          ...prev,
          [agentId]: prev[agentId].filter((m) => m.id !== assistantMessageId),
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [session?.access_token, conversations, activeAgentId, isLoading]
  );

  const value = useMemo(
    () => ({
      isOpen,
      activeAgentId,
      messages,
      isLoading,
      error,
      openChat,
      closeChat,
      setActiveAgent,
      sendMessage,
      clearMessages,
    }),
    [
      isOpen,
      activeAgentId,
      messages,
      isLoading,
      error,
      openChat,
      closeChat,
      setActiveAgent,
      sendMessage,
      clearMessages,
    ]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}

export { AGENTS };
