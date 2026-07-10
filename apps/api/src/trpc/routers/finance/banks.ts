import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../../trpc.js';
import {
  getAllBanks,
  searchBanks,
  getBankById,
  getPopularBanks,
  getBenefitProviders,
} from '../../../data/finance/bank-repository.js';

export const banksRouter = router({
  list: publicProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const q = input?.q;
      if (q && q.length >= 2) {
        return searchBanks(q);
      }
      return getAllBanks();
    }),

  popular: publicProcedure.query(async () => {
    return getPopularBanks();
  }),

  benefitProviders: publicProcedure.query(async () => {
    return getBenefitProviders();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const bank = await getBankById(input.id);

      if (!bank) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Banco não encontrado',
        });
      }

      return bank;
    }),
});
