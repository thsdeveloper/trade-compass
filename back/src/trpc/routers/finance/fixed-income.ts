import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getFixedIncomeByUser,
  getFixedIncomeById,
  createFixedIncome,
  updateFixedIncome,
  deleteFixedIncome,
  getFixedIncomeSummary,
  getContributionsByFixedIncome,
  createContribution,
  updateContribution,
  deleteContribution,
} from '../../../data/finance/fixed-income-repository.js';

const investmentTypeEnum = z.enum([
  'CDB',
  'LCI',
  'LCA',
  'TESOURO_SELIC',
  'TESOURO_PREFIXADO',
  'TESOURO_IPCA',
  'DEBENTURE',
  'CRI',
  'CRA',
  'LC',
  'OUTROS',
]);

const rateTypeEnum = z.enum(['PRE_FIXADO', 'POS_FIXADO', 'HIBRIDO']);
const rateIndexEnum = z.enum(['CDI', 'SELIC', 'IPCA', 'IGPM', 'NENHUM']);
const liquidityTypeEnum = z.enum([
  'NO_VENCIMENTO',
  'DIARIA',
  'D_PLUS_1',
  'D_PLUS_30',
  'D_PLUS_90',
  'OUTROS',
]);
const statusEnum = z.enum(['ATIVO', 'VENCIDO', 'RESGATADO', 'CANCELADO']);
const marketEnum = z.enum(['PRIMARIO', 'SECUNDARIO']);

const filtersSchema = z.object({
  investment_type: investmentTypeEnum.optional(),
  status: statusEnum.optional(),
  rate_type: rateTypeEnum.optional(),
  search: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const createFixedIncomeSchema = z.object({
  investment_type: investmentTypeEnum,
  name: z.string().min(1, 'Nome é obrigatório'),
  issuer: z.string().min(1, 'Emissor é obrigatório'),
  rate_type: rateTypeEnum,
  rate_value: z.number(),
  rate_index: rateIndexEnum.optional(),
  rate_spread: z.number().optional(),
  amount_invested: z.number().positive('Valor investido deve ser maior que zero'),
  current_value: z.number().optional(),
  minimum_investment: z.number().optional(),
  purchase_date: z.string(),
  maturity_date: z.string(),
  liquidity_type: liquidityTypeEnum.optional(),
  market: marketEnum.optional(),
  broker: z.string().optional(),
  custody_account: z.string().optional(),
  notes: z.string().optional(),
  goal_id: z.string().uuid().optional(),
});

const updateFixedIncomeSchema = z.object({
  investment_type: investmentTypeEnum.optional(),
  name: z.string().optional(),
  issuer: z.string().optional(),
  rate_type: rateTypeEnum.optional(),
  rate_value: z.number().optional(),
  rate_index: rateIndexEnum.optional(),
  rate_spread: z.number().optional(),
  amount_invested: z.number().positive().optional(),
  current_value: z.number().optional(),
  minimum_investment: z.number().optional(),
  purchase_date: z.string().optional(),
  maturity_date: z.string().optional(),
  liquidity_type: liquidityTypeEnum.optional(),
  market: marketEnum.optional(),
  status: statusEnum.optional(),
  broker: z.string().optional(),
  custody_account: z.string().optional(),
  notes: z.string().optional(),
  goal_id: z.string().uuid().nullable().optional(),
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

export const fixedIncomeRouter = router({
  list: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input }) => {
      return getFixedIncomeByUser(ctx.user.id, input || {}, ctx.accessToken);
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    return getFixedIncomeSummary(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const investment = await getFixedIncomeById(input.id, ctx.user.id, ctx.accessToken);

      if (!investment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Investimento não encontrado',
        });
      }

      return investment;
    }),

  create: protectedProcedure
    .input(createFixedIncomeSchema)
    .mutation(async ({ ctx, input }) => {
      return createFixedIncome(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateFixedIncomeSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateFixedIncome(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar investimento';
        if (message.includes('nao encontrad')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteFixedIncome(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover investimento';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getContributions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getContributionsByFixedIncome(input.id, ctx.user.id, ctx.accessToken);
    }),

  createContribution: protectedProcedure
    .input(
      z.object({
        fixedIncomeId: z.string().uuid(),
        data: createContributionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createContribution(input.fixedIncomeId, ctx.user.id, input.data, ctx.accessToken);
    }),

  updateContribution: protectedProcedure
    .input(
      z.object({
        fixedIncomeId: z.string().uuid(),
        contributionId: z.string().uuid(),
        data: updateContributionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContribution(
          input.contributionId,
          input.fixedIncomeId,
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
        fixedIncomeId: z.string().uuid(),
        contributionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteContribution(
          input.contributionId,
          input.fixedIncomeId,
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
