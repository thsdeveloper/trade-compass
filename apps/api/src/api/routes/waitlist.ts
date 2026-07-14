import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabase.js';

const waitlistInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  source: z
    .enum(['landing_hero', 'landing_mobile', 'landing_footer'])
    .default('landing_hero'),
  utm: z.record(z.string().max(64), z.string().max(200)).optional(),
});

// Rate limiting simples em memória por IP (rota pública, sem auth)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

interface WaitlistBody {
  email: string;
  source?: string;
  utm?: Record<string, string>;
}

export async function waitlistRoutes(app: FastifyInstance) {
  app.post(
    '/waitlist',
    async (request: FastifyRequest<{ Body: WaitlistBody }>, reply) => {
      if (!checkRateLimit(request.ip)) {
        return reply.status(429).send({
          error: 'Too Many Requests',
          message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
          statusCode: 429,
        });
      }

      const parsed = waitlistInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Informe um e-mail válido.',
          statusCode: 400,
        });
      }

      const { email, source, utm } = parsed.data;

      const { error } = await supabaseAdmin.from('waitlist_leads').insert({
        email,
        source,
        utm: utm ?? null,
      });

      // 23505 = unique_violation (e-mail já inscrito). Responde sucesso
      // idempotente para não vazar existência do e-mail nem punir reenvio.
      if (error && error.code !== '23505') {
        request.log.error({ err: error }, 'Erro ao inserir lead na waitlist');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Não foi possível concluir a inscrição. Tente novamente.',
          statusCode: 500,
        });
      }

      return reply.status(error ? 200 : 201).send({ success: true });
    }
  );
}
