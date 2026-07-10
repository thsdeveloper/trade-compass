import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getAccountsByUser,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../../../data/finance/account-repository.js';

const accountTypeEnum = z.enum([
  'CONTA_CORRENTE',
  'POUPANCA',
  'CARTEIRA',
  'INVESTIMENTO',
  'BENEFICIO',
]);

const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: accountTypeEnum,
  bank_id: z.string().uuid().optional(),
  initial_balance: z.number().default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().optional(),
  bank_id: z.string().uuid().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  initial_balance: z.number().optional(),
});

export const accountsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAccountsByUser(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const account = await getAccountById(input.id, ctx.user.id, ctx.accessToken);

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conta não encontrada',
        });
      }

      return account;
    }),

  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return createAccount(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateAccountSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAccount(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar conta';
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
        await deleteAccount(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover conta';
        if (message.includes('registros vinculados')) {
          throw new TRPCError({ code: 'CONFLICT', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
