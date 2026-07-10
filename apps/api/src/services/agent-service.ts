import { openai, OPENAI_MODEL } from '../lib/openai.js';
import {
  type FinancialContext,
  formatFinancialContextForPrompt,
} from './agent-data-aggregator.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Voce e o Assistente Financeiro do Trade Compass, um aplicativo de gestao financeira pessoal.

REGRAS IMPORTANTES:
1. Responda APENAS com base nos dados financeiros fornecidos abaixo
2. Use moeda brasileira (R$) formatada corretamente
3. Seja conciso mas informativo
4. Se nao tiver informacao suficiente nos dados, diga claramente
5. NAO faca sugestoes de investimento especificas (acoes, fundos, etc.)
6. Seja amigavel e prestativo
7. Responda sempre em portugues brasileiro
8. Use formatacao simples (sem markdown complexo)

CONTEXTO FINANCEIRO DO USUARIO:
{context}`;

function buildSystemPrompt(context: FinancialContext): string {
  const formattedContext = formatFinancialContextForPrompt(context);
  return SYSTEM_PROMPT.replace('{context}', formattedContext);
}

export async function chat(
  messages: ChatMessage[],
  context: FinancialContext
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const systemPrompt = buildSystemPrompt(context);

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'Desculpe, nao consegui gerar uma resposta.';
}

export async function* streamChat(
  messages: ChatMessage[],
  context: FinancialContext
): AsyncGenerator<string> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const systemPrompt = buildSystemPrompt(context);

  const stream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
