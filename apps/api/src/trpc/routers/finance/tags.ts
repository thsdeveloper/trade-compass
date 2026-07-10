import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getTagsByUser,
  getTagById,
  createTag,
  deleteTag,
} from '../../../data/finance/tag-repository.js';

const createTagSchema = z.object({
  name: z.string().min(1, 'Nome da tag é obrigatório'),
});

export const tagsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTagsByUser(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tag = await getTagById(input.id, ctx.user.id, ctx.accessToken);

      if (!tag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag não encontrada',
        });
      }

      return tag;
    }),

  create: protectedProcedure
    .input(createTagSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTag(ctx.user.id, input, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar tag';
        if (message.includes('ja existe')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteTag(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover tag';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
