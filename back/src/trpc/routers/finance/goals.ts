import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getGoalsByUser,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalSummary,
  getActiveGoalsForSelect,
  getGoalContributionHistory,
  createGoalContribution,
  updateGoalContribution,
  deleteGoalContribution,
} from '../../../data/finance/goal-repository.js';

const goalCategoryEnum = z.enum([
  'VEICULO',
  'IMOVEL',
  'VIAGEM',
  'EDUCACAO',
  'RESERVA_EMERGENCIA',
  'INVESTIMENTO',
  'OUTROS',
]);

const goalPriorityEnum = z.enum(['BAIXA', 'MEDIA', 'ALTA']);
const goalStatusEnum = z.enum(['ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO']);

const filtersSchema = z.object({
  status: goalStatusEnum.optional(),
  goal_category: goalCategoryEnum.optional(),
  priority: goalPriorityEnum.optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const createGoalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  goal_category: goalCategoryEnum,
  target_amount: z.number().positive('Valor alvo deve ser maior que zero'),
  deadline: z.string().optional(),
  priority: goalPriorityEnum.optional(),
  linked_account_id: z.string().uuid().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateGoalSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  goal_category: goalCategoryEnum.optional(),
  target_amount: z.number().positive().optional(),
  deadline: z.string().optional(),
  priority: goalPriorityEnum.optional(),
  status: goalStatusEnum.optional(),
  linked_account_id: z.string().uuid().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const createContributionSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero'),
  contribution_date: z.string(),
  description: z.string().optional(),
});

const updateContributionSchema = z.object({
  amount: z.number().positive().optional(),
  contribution_date: z.string().optional(),
  description: z.string().optional(),
});

export const goalsRouter = router({
  list: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input }) => {
      return getGoalsByUser(ctx.user.id, input || {}, ctx.accessToken);
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    return getGoalSummary(ctx.user.id, ctx.accessToken);
  }),

  select: protectedProcedure.query(async ({ ctx }) => {
    return getActiveGoalsForSelect(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const goal = await getGoalById(input.id, ctx.user.id, ctx.accessToken);

      if (!goal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Objetivo não encontrado',
        });
      }

      return goal;
    }),

  create: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      return createGoal(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateGoalSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGoal(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar objetivo';
        if (message.includes('nao encontrado')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteGoal(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover objetivo';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getContributionHistory: protectedProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getGoalContributionHistory(input.goalId, ctx.user.id, ctx.accessToken);
    }),

  createContribution: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        data: createContributionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createGoalContribution(input.goalId, ctx.user.id, input.data, ctx.accessToken);
    }),

  updateContribution: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        contributionId: z.string().uuid(),
        data: updateContributionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGoalContribution(
          input.contributionId,
          input.goalId,
          ctx.user.id,
          input.data,
          ctx.accessToken
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar contribuição';
        if (message.includes('nao encontrad')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  deleteContribution: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        contributionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteGoalContribution(
          input.contributionId,
          input.goalId,
          ctx.user.id,
          ctx.accessToken
        );
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover contribuição';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
