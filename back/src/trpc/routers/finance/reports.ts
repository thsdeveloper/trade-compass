import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getCashFlowReport,
  getBudgetAnalysisReport,
  getCategoryBreakdownReport,
  getPaymentMethodsReport,
  getGoalsProgressReport,
  getRecurringAnalysisReport,
  getYoYComparisonReport,
} from '../../../data/finance/report-repository.js';

const periodSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  include_pending: z.boolean().optional().default(false),
});

export const reportsRouter = router({
  cashFlow: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      return getCashFlowReport(
        ctx.user.id,
        input.start_date,
        input.end_date,
        input.include_pending,
        ctx.accessToken
      );
    }),

  budgetAnalysis: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      return getBudgetAnalysisReport(
        ctx.user.id,
        input.start_date,
        input.end_date,
        input.include_pending,
        ctx.accessToken
      );
    }),

  categoryBreakdown: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      return getCategoryBreakdownReport(
        ctx.user.id,
        input.start_date,
        input.end_date,
        input.include_pending,
        ctx.accessToken
      );
    }),

  paymentMethods: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      return getPaymentMethodsReport(
        ctx.user.id,
        input.start_date,
        input.end_date,
        input.include_pending,
        ctx.accessToken
      );
    }),

  goalsProgress: protectedProcedure.query(async ({ ctx }) => {
    return getGoalsProgressReport(ctx.user.id, ctx.accessToken);
  }),

  recurringAnalysis: protectedProcedure.query(async ({ ctx }) => {
    return getRecurringAnalysisReport(ctx.user.id, ctx.accessToken);
  }),

  yoyComparison: protectedProcedure
    .input(
      z.object({
        years: z.array(z.number().min(2000).max(2100)).min(1).max(5),
      })
    )
    .query(async ({ ctx, input }) => {
      return getYoYComparisonReport(ctx.user.id, input.years, ctx.accessToken);
    }),
});
