import { openai, OPENAI_MODEL } from '../lib/openai.js';
import type { AgentDefinition } from './agents/types.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSystemPrompt(agent: AgentDefinition, contextText: string): string {
  return agent.systemPrompt.replace('{context}', contextText);
}

function buildRequestMessages(
  agent: AgentDefinition,
  messages: ChatMessage[],
  contextText: string
) {
  return [
    { role: 'system' as const, content: buildSystemPrompt(agent, contextText) },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];
}

export async function chat(
  messages: ChatMessage[],
  agent: AgentDefinition,
  contextText: string
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const response = await openai.chat.completions.create({
    model: agent.model || OPENAI_MODEL,
    messages: buildRequestMessages(agent, messages, contextText),
    max_tokens: agent.maxTokens,
    temperature: agent.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content || 'Desculpe, nao consegui gerar uma resposta.';
}

export async function* streamChat(
  messages: ChatMessage[],
  agent: AgentDefinition,
  contextText: string
): AsyncGenerator<string> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const stream = await openai.chat.completions.create({
    model: agent.model || OPENAI_MODEL,
    messages: buildRequestMessages(agent, messages, contextText),
    max_tokens: agent.maxTokens,
    temperature: agent.temperature ?? 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
