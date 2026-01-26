import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getCategoriesByUser,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrCreateAdjustmentCategory,
} from '../../../data/finance/category-repository.js';

const categoryTypeEnum = z.enum(['DESPESA', 'RECEITA']);
const budgetCategoryEnum = z.enum(['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO']);

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: categoryTypeEnum,
  color: z.string().optional(),
  icon: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  budget_category: budgetCategoryEnum.optional(),
});

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

  create: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return createCategory(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateCategorySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCategory(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteCategory(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover categoria';
        if (message.includes('transacao')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getAdjustmentCategory: protectedProcedure
    .input(z.object({ type: categoryTypeEnum }))
    .query(async ({ ctx, input }) => {
      return getOrCreateAdjustmentCategory(ctx.user.id, input.type, ctx.accessToken);
    }),
});
