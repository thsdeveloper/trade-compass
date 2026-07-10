import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Middleware to check if user is authenticated
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.accessToken) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Token de autenticacao ausente ou invalido',
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      accessToken: ctx.accessToken,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
