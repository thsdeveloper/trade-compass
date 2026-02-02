import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { getFinancialContext } from '../../services/agent-data-aggregator.js';
import { chat, type ChatMessage } from '../../services/agent-service.js';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(1000, 'Mensagem muito longa (max 1000 caracteres)'),
});

const chatInputSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'Envie pelo menos uma mensagem')
    .max(20, 'Limite de 20 mensagens por conversa'),
});

// Simple in-memory rate limiting
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export const agentRouter = router({
  /**
   * Get the user's financial context (for debugging or UI purposes)
   */
  getContext: protectedProcedure.query(async ({ ctx }) => {
    const context = await getFinancialContext(ctx.user.id, ctx.accessToken);
    return context;
  }),

  /**
   * Send a chat message and get a response (non-streaming)
   */
  chat: protectedProcedure.input(chatInputSchema).mutation(async ({ ctx, input }) => {
    // Rate limiting
    if (!checkRateLimit(ctx.user.id)) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Limite de requisicoes excedido. Aguarde um momento antes de enviar mais mensagens.',
      });
    }

    try {
      const context = await getFinancialContext(ctx.user.id, ctx.accessToken);
      const response = await chat(input.messages as ChatMessage[], context);
      return { response };
    } catch (error) {
      console.error('Agent chat error:', error);

      if (error instanceof Error && error.message.includes('OpenAI')) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Servico de IA temporariamente indisponivel. Tente novamente em alguns instantes.',
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao processar mensagem. Tente novamente.',
      });
    }
  }),
});

export type AgentRouter = typeof agentRouter;
