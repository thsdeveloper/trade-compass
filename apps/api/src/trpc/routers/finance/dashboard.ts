import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getFinanceSummary,
  getExpensesByCategory,
  getCashFlow,
  getUpcomingPayments,
  getUpcomingPaymentsByMonth,
  getBudgetAllocation,
  getYearSummary,
} from '../../../data/finance/dashboard-repository.js';

const monthRegex = /^\d{4}-\d{2}$/;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const dashboardRouter = router({
  summary: protectedProcedure
    .input(
      z
        .object({
          month: z.string().regex(monthRegex, 'Mês deve estar no formato YYYY-MM').optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const targetMonth = input?.month || getCurrentMonth();
      return getFinanceSummary(ctx.user.id, targetMonth, ctx.accessToken);
    }),

  byCategory: protectedProcedure
    .input(
      z
        .object({
          month: z.string().regex(monthRegex, 'Mês deve estar no formato YYYY-MM').optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const targetMonth = input?.month || getCurrentMonth();
      return getExpensesByCategory(ctx.user.id, targetMonth, ctx.accessToken);
    }),

  cashFlow: protectedProcedure
    .input(
      z
        .object({
          months: z.number().min(1).max(12).default(6),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const months = input?.months || 6;
      return getCashFlow(ctx.user.id, months, ctx.accessToken);
    }),

  upcoming: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).optional(),
          month: z.string().regex(monthRegex).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (input?.month) {
        return getUpcomingPaymentsByMonth(ctx.user.id, input.month, ctx.accessToken);
      }
      const days = input?.days || 30;
      return getUpcomingPayments(ctx.user.id, days, ctx.accessToken);
    }),

  budgetAllocation: protectedProcedure
    .input(
      z
        .object({
          month: z.string().regex(monthRegex, 'Mês deve estar no formato YYYY-MM').optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const targetMonth = input?.month || getCurrentMonth();
      return getBudgetAllocation(ctx.user.id, targetMonth, ctx.accessToken);
    }),

  yearSummary: protectedProcedure
    .input(
      z
        .object({
          year: z.number().min(2000).max(2100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const targetYear = input?.year || new Date().getFullYear();
      return getYearSummary(ctx.user.id, targetYear, ctx.accessToken);
    }),
});
