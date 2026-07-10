import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getRecurrencesByUser,
  getRecurrenceById,
  createRecurrence,
  updateRecurrence,
  deleteRecurrence,
  generateNextOccurrences,
  getPendingRecurrences,
} from '../../../data/finance/recurrence-repository.js';

const transactionTypeEnum = z.enum(['RECEITA', 'DESPESA', 'TRANSFERENCIA']);
const frequencyEnum = z.enum([
  'DIARIA',
  'SEMANAL',
  'QUINZENAL',
  'MENSAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
]);

const createRecurrenceSchema = z.object({
  category_id: z.string().uuid('Categoria é obrigatória'),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  type: transactionTypeEnum,
  frequency: frequencyEnum,
  start_date: z.string(),
  end_date: z.string().optional(),
});

const updateRecurrenceSchema = z.object({
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  frequency: frequencyEnum.optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const recurrencesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRecurrencesByUser(ctx.user.id, ctx.accessToken);
  }),

  pending: protectedProcedure.query(async ({ ctx }) => {
    return getPendingRecurrences(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const recurrence = await getRecurrenceById(input.id, ctx.user.id, ctx.accessToken);

      if (!recurrence) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recorrência não encontrada',
        });
      }

      return recurrence;
    }),

  create: protectedProcedure
    .input(createRecurrenceSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.account_id && input.credit_card_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Informe conta OU cartão, não ambos',
        });
      }

      return createRecurrence(ctx.user.id, input, ctx.accessToken);
    }),

  generate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        count: z.number().min(1).max(2000).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateNextOccurrences(input.id, ctx.user.id, input.count, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar transações';
        if (message.includes('nao encontrada') || message.includes('inativa')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateRecurrenceSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateRecurrence(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar recorrência';
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
        await deleteRecurrence(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover recorrência';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
