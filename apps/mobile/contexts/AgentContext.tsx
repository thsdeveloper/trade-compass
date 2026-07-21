import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { streamAgentChat } from '@/lib/agent-api';
import type { ChatMessage } from '@/types/agent';

interface AgentContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  /** Interrompe o streaming em andamento, preservando o texto já recebido */
  stopStreaming: () => void;
  /** Reenvia a última mensagem do usuário (após erro), sem duplicá-la */
  retryLast: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

// Intervalo mínimo entre re-renders durante o streaming. Sem isso, cada token
// da OpenAI dispara um setState e a FlatList re-renderiza dezenas de vezes
// por segundo.
const STREAM_FLUSH_MS = 80;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Espelho do estado para ações que precisam do histórico fora do render
  // (retryLast dispara sendMessage logo após um setMessages)
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      if (!session?.access_token) {
        setError('Voce precisa estar logado para usar o assistente.');
        return;
      }

      setError(null);
      setIsLoading(true);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
      };

      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);

      const apiMessages = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abortController = new AbortController();
      abortRef.current = abortController;

      let fullContent = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const flush = () => {
        flushTimer = null;
        const snapshot = fullContent;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
        );
      };

      try {
        await streamAgentChat({
          messages: apiMessages,
          accessToken: session.access_token,
          signal: abortController.signal,
          onChunk: (text) => {
            fullContent += text;
            if (!flushTimer) {
              flushTimer = setTimeout(flush, STREAM_FLUSH_MS);
            }
          },
        });

        if (flushTimer) clearTimeout(flushTimer);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, isStreaming: false }
              : m
          )
        );
      } catch (err) {
        if (flushTimer) clearTimeout(flushTimer);

        if (abortController.signal.aborted) return;

        const message =
          err instanceof Error ? err.message : 'Erro ao enviar mensagem';
        setError(message);

        // Remove a mensagem vazia do assistente; mantém a do usuário para
        // que ele possa reenviar.
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        if (abortRef.current === abortController) {
          abortRef.current = null;
        }
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [session?.access_token, isLoading]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Preserva o que já foi transmitido; descarta bolha ainda vazia
    setMessages((prev) =>
      prev
        .filter((m) => !(m.isStreaming && !m.content))
        .map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
    setIsLoading(false);
  }, []);

  const retryLast = useCallback(() => {
    const msgs = messagesRef.current;
    const lastUserIndex = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;
    const content = msgs[lastUserIndex].content;
    // Remove a mensagem do usuário do histórico antes de reenviar — o
    // sendMessage a recoloca, evitando duplicata no payload e na lista
    const history = msgs.slice(0, lastUserIndex);
    messagesRef.current = history;
    setMessages(history);
    setError(null);
    void sendMessage(content);
  }, [sendMessage]);

  const value = useMemo(
    () => ({
      messages,
      isLoading,
      error,
      sendMessage,
      clearMessages,
      stopStreaming,
      retryLast,
    }),
    [messages, isLoading, error, sendMessage, clearMessages, stopStreaming, retryLast]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
