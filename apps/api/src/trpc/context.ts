import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { supabaseAdmin } from '../lib/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface Context {
  user: AuthenticatedUser | null;
  accessToken: string | null;
}

export async function createContext({
  req,
}: CreateFastifyContextOptions): Promise<Context> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, accessToken: null };
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { user: null, accessToken: null };
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
      },
      accessToken: token,
    };
  } catch {
    return { user: null, accessToken: null };
  }
}
