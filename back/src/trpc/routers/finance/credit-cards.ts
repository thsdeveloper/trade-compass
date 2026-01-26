import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getCreditCardsByUser,
  getCreditCardById,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from '../../../data/finance/credit-card-repository.js';
import { getTransactionsByCreditCardAndPeriod } from '../../../data/finance/transaction-repository.js';
import {
  payInvoice,
  getInvoicePaymentsByCard,
} from '../../../data/finance/invoice-payment-repository.js';

const brandEnum = z.enum(['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS']);
const paymentTypeEnum = z.enum(['TOTAL', 'PARCIAL', 'MINIMO']);

const createCreditCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  brand: brandEnum,
  total_limit: z.number().positive('Limite deve ser maior que zero'),
  closing_day: z.number().min(1).max(31, 'Dia de fechamento deve estar entre 1 e 31'),
  due_day: z.number().min(1).max(31, 'Dia de vencimento deve estar entre 1 e 31'),
  color: z.string().optional(),
});

const updateCreditCardSchema = z.object({
  name: z.string().optional(),
  brand: brandEnum.optional(),
  total_limit: z.number().positive().optional(),
  closing_day: z.number().min(1).max(31).optional(),
  due_day: z.number().min(1).max(31).optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
});

const payInvoiceSchema = z.object({
  account_id: z.string().uuid('Conta é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  invoice_month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM'),
  payment_type: paymentTypeEnum,
  payment_date: z.string().optional(),
  notes: z.string().optional(),
});

export const creditCardsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCreditCardsByUser(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const card = await getCreditCardById(input.id, ctx.user.id, ctx.accessToken);

      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cartão não encontrado',
        });
      }

      return card;
    }),

  getInvoice: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM'),
      })
    )
    .query(async ({ ctx, input }) => {
      const card = await getCreditCardById(input.id, ctx.user.id, ctx.accessToken);

      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cartão não encontrado',
        });
      }

      const [year, monthNum] = input.month.split('-').map(Number);
      const closingDay = card.closing_day;
      const dueDay = card.due_day;

      const startDate = new Date(year, monthNum - 2, closingDay + 1);
      const endDate = new Date(year, monthNum - 1, closingDay);

      const closingDateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;

      let dueYear = year;
      let dueMonth = monthNum;
      if (dueDay <= closingDay) {
        dueMonth = monthNum + 1;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear = year + 1;
        }
      }
      const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const transactions = await getTransactionsByCreditCardAndPeriod(
        input.id,
        ctx.user.id,
        formatDate(startDate),
        formatDate(endDate),
        ctx.accessToken
      );

      const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        credit_card: card,
        month: input.month,
        transactions,
        total,
        closing_date: closingDateStr,
        due_date: dueDateStr,
      };
    }),

  create: protectedProcedure
    .input(createCreditCardSchema)
    .mutation(async ({ ctx, input }) => {
      return createCreditCard(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateCreditCardSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCreditCard(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar cartão';
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
        await deleteCreditCard(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover cartão';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  payInvoice: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        data: payInvoiceSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await payInvoice(ctx.user.id, input.cardId, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao pagar fatura';
        if (message.includes('nao encontrad')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getPayments: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const card = await getCreditCardById(input.id, ctx.user.id, ctx.accessToken);

      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cartão não encontrado',
        });
      }

      return getInvoicePaymentsByCard(input.id, ctx.user.id, ctx.accessToken);
    }),
});
