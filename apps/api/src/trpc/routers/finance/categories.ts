import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getCategoriesByUser,
  getCategoryById,
  getOrCreateAdjustmentCategory,
} from '../../../data/finance/category-repository.js';

const categoryTypeEnum = z.enum(['DESPESA', 'RECEITA']);

// Categorias são somente leitura (catálogo global do sistema).
export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCategoriesByUser(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const category = await getCategoryById(input.id, ctx.user.id, ctx.accessToken);

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Categoria não encontrada',
        });
      }

      return category;
    }),

  getAdjustmentCategory: protectedProcedure
    .input(z.object({ type: categoryTypeEnum }))
    .query(async ({ ctx, input }) => {
      return getOrCreateAdjustmentCategory(ctx.user.id, input.type, ctx.accessToken);
    }),
});
