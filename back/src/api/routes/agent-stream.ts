import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabase.js';
import { getFinancialContext } from '../../services/agent-data-aggregator.js';
import { streamChat, type ChatMessage } from '../../services/agent-service.js';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(1000),
});

const chatInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

// Simple in-memory rate limiting (shared with tRPC router)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

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

async function authenticateRequest(
  request: FastifyRequest
): Promise<{ userId: string; accessToken: string } | null> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { userId: user.id, accessToken: token };
  } catch {
    return null;
  }
}

interface AgentStreamBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function agentStreamRoutes(app: FastifyInstance) {
  app.post<{
    Body: AgentStreamBody;
  }>('/api/agent/stream', async (request: FastifyRequest<{ Body: AgentStreamBody }>, reply: FastifyReply) => {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Rate limit
    if (!checkRateLimit(auth.userId)) {
      return reply.status(429).send({
        error: 'Rate limit exceeded. Please wait before sending more messages.',
      });
    }

    // Validate input
    const parseResult = chatInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
    }

    const { messages } = parseResult.data;

    try {
      // Get financial context
      const context = await getFinancialContext(auth.userId, auth.accessToken);

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      });

      // Stream the response
      const generator = streamChat(messages as ChatMessage[], context);

      for await (const chunk of generator) {
        reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Send done event
      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      reply.raw.end();
    } catch (error) {
      console.error('Agent stream error:', error);

      // If headers already sent, try to send error event
      if (reply.raw.headersSent) {
        reply.raw.write(
          `data: ${JSON.stringify({ error: 'Erro ao processar mensagem' })}\n\n`
        );
        reply.raw.end();
      } else {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Handle CORS preflight
  app.options('/api/agent/stream', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return reply.status(204).send();
  });
}
