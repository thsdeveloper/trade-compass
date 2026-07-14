import { fetch as expoFetch } from 'expo/fetch';
import type { AgentApiMessage, ReceiptExtractionResult } from '@/types/agent';

import { API_URL } from './api-config';

// Limites alinhados com o backend (chatInputSchema: max 20 msgs / 1000 chars).
// A janela enviada é menor que o teto do backend para conter o custo de tokens:
// o contexto financeiro já é injetado no system prompt a cada request, então
// mensagens antigas raramente mudam a resposta.
export const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 12;

interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

export type AgentId = 'financeiro' | 'investimentos';

export interface StreamAgentChatOptions {
  messages: AgentApiMessage[];
  accessToken: string;
  agentId?: AgentId;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
}

export async function streamAgentChat({
  messages,
  accessToken,
  agentId = 'financeiro',
  signal,
  onChunk,
}: StreamAgentChatOptions): Promise<void> {
  const history = messages.slice(-MAX_HISTORY_MESSAGES);

  const response = await expoFetch(`${API_URL}/api/agent/${agentId}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages: history }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        'Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.'
      );
    }
    const errorData = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(errorData.error || `Erro ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Resposta sem stream');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      let data: StreamChunk;
      try {
        data = JSON.parse(line.substring(6));
      } catch {
        continue;
      }

      if (data.error) {
        throw new Error(data.error);
      }
      if (data.content) {
        onChunk(data.content);
      }
      if (data.done) {
        return;
      }
    }
  }
}

export interface ExtractReceiptOptions {
  accessToken: string;
  text?: string;
  qrData?: string;
  imageBase64?: string;
}

/**
 * Envia texto livre, QR code de NFC-e e/ou foto da nota para o agente
 * interpretar e devolver um rascunho de transação.
 */
export async function extractReceipt({
  accessToken,
  text,
  qrData,
  imageBase64,
}: ExtractReceiptOptions): Promise<ReceiptExtractionResult> {
  const response = await expoFetch(`${API_URL}/api/agent/nota/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, qrData, imageBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}) as { error?: string });
    if (response.status === 429) {
      throw new Error(
        'Muitas leituras em pouco tempo. Aguarde um instante e tente novamente.'
      );
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }

  return (await response.json()) as ReceiptExtractionResult;
}
