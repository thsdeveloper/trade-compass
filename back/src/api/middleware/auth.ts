import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../lib/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  accessToken: string;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Token de autenticacao ausente ou invalido',
      statusCode: 401,
    });
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token invalido ou expirado',
        statusCode: 401,
      });
    }

    // Attach user info to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email!,
    };
    (request as AuthenticatedRequest).accessToken = token;
  } catch (err) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Falha na validacao do token',
      statusCode: 401,
    });
  }
}

// Plugin to register auth hook for specific routes
export async function authPlugin(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
}
