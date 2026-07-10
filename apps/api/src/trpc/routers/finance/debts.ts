import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getDebtsByUser,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  getNegotiationsByDebt,
  createNegotiation,
  updateNegotiation,
  generateTransactionsFromNegotiation,
  getDebtSummary,
} from '../../../data/finance/debt-repository.js';

const debtTypeEnum = z.enum([
  'BANCO',
  'CARTAO_CREDITO',
  'EMPRESTIMO_PESSOAL',
  'FINANCIAMENTO',
  'CHEQUE_ESPECIAL',
  'BOLETO',
  'FORNECEDOR',
  'OUTROS',
]);

const debtStatusEnum = z.enum([
  'EM_ABERTO',
  'EM_NEGOCIACAO',
  'NEGOCIADA',
  'QUITADA',
  'CANCELADA',
]);

const paymentMethodEnum = z.enum(['A_VISTA', 'PARCELADO']);
const negotiationStatusEnum = z.enum(['PENDENTE', 'APROVADA', 'REJEITADA', 'CONCLUIDA']);

const filtersSchema = z.object({
  status: debtStatusEnum.optional(),
  debt_type: debtTypeEnum.optional(),
  creditor_name: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const createDebtSchema = z.object({
  creditor_name: z.string().min(1, 'Nome do credor é obrigatório'),
  debt_type: debtTypeEnum,
  original_amount: z.number().positive(),
  updated_amount: z.number().positive(),
  original_due_date: z.string(),
  contract_number: z.string().optional(),
  creditor_document: z.string().optional(),
  creditor_contact_phone: z.string().optional(),
  creditor_contact_email: z.string().optional(),
  notes: z.string().optional(),
});

const updateDebtSchema = z.object({
  creditor_name: z.string().optional(),
  debt_type: debtTypeEnum.optional(),
  original_amount: z.number().positive().optional(),
  updated_amount: z.number().positive().optional(),
  original_due_date: z.string().optional(),
  status: debtStatusEnum.optional(),
  contract_number: z.string().optional(),
  creditor_document: z.string().optional(),
  creditor_contact_phone: z.string().optional(),
  creditor_contact_email: z.string().optional(),
  notes: z.string().optional(),
});

const createNegotiationSchema = z.object({
  payment_method: paymentMethodEnum,
  total_installments: z.number().optional(),
  negotiated_value: z.number().positive(),
  first_payment_date: z.string(),
  protocol_number: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  notes: z.string().optional(),
});

const updateNegotiationSchema = z.object({
  payment_method: paymentMethodEnum.optional(),
  total_installments: z.number().optional(),
  negotiated_value: z.number().positive().optional(),
  first_payment_date: z.string().optional(),
  protocol_number: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  notes: z.string().optional(),
  status: negotiationStatusEnum.optional(),
});

export const debtsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    return getDebtSummary(ctx.user.id, ctx.accessToken);
  }),

  list: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input }) => {
      return getDebtsByUser(ctx.user.id, input || {}, ctx.accessToken);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const debt = await getDebtById(input.id, ctx.user.id, ctx.accessToken);

      if (!debt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Dívida não encontrada',
        });
      }

      return debt;
    }),

  create: protectedProcedure
    .input(createDebtSchema)
    .mutation(async ({ ctx, input }) => {
      return createDebt(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateDebtSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateDebt(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar dívida';
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
        await deleteDebt(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover dívida';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getNegotiations: protectedProcedure
    .input(z.object({ debtId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getNegotiationsByDebt(input.debtId, ctx.user.id, ctx.accessToken);
    }),

  createNegotiation: protectedProcedure
    .input(
      z.object({
        debtId: z.string().uuid(),
        data: createNegotiationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createNegotiation(ctx.user.id, input.debtId, input.data, ctx.accessToken);
    }),

  updateNegotiation: protectedProcedure
    .input(
      z.object({
        debtId: z.string().uuid(),
        negotiationId: z.string().uuid(),
        data: updateNegotiationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNegotiation(
          input.debtId,
          input.negotiationId,
          ctx.user.id,
          input.data,
          ctx.accessToken
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar negociação';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  generateTransactions: protectedProcedure
    .input(
      z.object({
        debtId: z.string().uuid(),
        negotiationId: z.string().uuid(),
        category_id: z.string().uuid(),
        account_id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateTransactionsFromNegotiation(
          ctx.user.id,
          input.debtId,
          input.negotiationId,
          { category_id: input.category_id, account_id: input.account_id },
          ctx.accessToken
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar transações';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
