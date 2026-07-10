import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getMortgagesByUser,
  getMortgageById,
  createMortgage,
  updateMortgage,
  deleteMortgage,
  getMortgageSummary,
  getInstallmentsByMortgage,
  payInstallment,
  getExtraPaymentsByMortgage,
  createExtraPayment,
  simulateExtraPaymentForMortgage,
  simulateEarlyPayoffForMortgage,
  simulateAmortizationForMortgage,
  getAnnualReport,
} from '../../../data/finance/mortgage-repository.js';

const amortizationSystemEnum = z.enum(['SAC', 'PRICE', 'SACRE']);
const rateIndexEnum = z.enum(['TR', 'IPCA', 'IGPM', 'FIXO']);
const modalityEnum = z.enum(['SFH', 'SFI', 'FGTS', 'SBPE', 'OUTROS']);
const statusEnum = z.enum(['ATIVO', 'QUITADO', 'ATRASADO', 'CANCELADO']);
const installmentStatusEnum = z.enum(['PENDENTE', 'PAGA', 'VENCIDA', 'PARCIAL']);
const extraPaymentTypeEnum = z.enum(['REDUCE_TERM', 'REDUCE_INSTALLMENT']);

const filtersSchema = z.object({
  status: statusEnum.optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const installmentFiltersSchema = z.object({
  status: installmentStatusEnum.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const createMortgageSchema = z.object({
  contract_number: z.string().min(1, 'Número do contrato é obrigatório'),
  institution_name: z.string().min(1, 'Nome da instituição é obrigatório'),
  institution_bank_id: z.string().uuid().optional(),
  modality: modalityEnum.optional(),
  amortization_system: amortizationSystemEnum.optional(),
  property_value: z.number().positive(),
  financed_amount: z.number().positive(),
  down_payment: z.number().optional(),
  base_annual_rate: z.number(),
  reduced_annual_rate: z.number().optional(),
  rate_index: rateIndexEnum.optional(),
  is_reduced_rate_active: z.boolean().optional(),
  total_installments: z.number().positive(),
  contract_start_date: z.string(),
  first_installment_date: z.string(),
  mip_rate: z.number().optional(),
  dfi_rate: z.number().optional(),
  admin_fee: z.number().optional(),
  alert_days_before: z.number().optional(),
  notes: z.string().optional(),
});

const updateMortgageSchema = z.object({
  contract_number: z.string().optional(),
  institution_name: z.string().optional(),
  institution_bank_id: z.string().uuid().nullable().optional(),
  modality: modalityEnum.optional(),
  base_annual_rate: z.number().optional(),
  reduced_annual_rate: z.number().nullable().optional(),
  is_reduced_rate_active: z.boolean().optional(),
  mip_rate: z.number().nullable().optional(),
  dfi_rate: z.number().nullable().optional(),
  admin_fee: z.number().optional(),
  status: statusEnum.optional(),
  alert_days_before: z.number().optional(),
  notes: z.string().nullable().optional(),
});

const payInstallmentSchema = z.object({
  paid_amount: z.number().positive().optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
});

const createExtraPaymentSchema = z.object({
  payment_date: z.string(),
  amount: z.number().positive(),
  payment_type: extraPaymentTypeEnum,
  notes: z.string().optional(),
});

const extraPaymentConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['ONE_TIME', 'RECURRING']),
  amount: z.number().positive(),
  start_month: z.number().optional(),
  end_month: z.number().nullable().optional(),
  payment_type: extraPaymentTypeEnum,
});

const simulateAmortizationSchema = z.object({
  extra_payments: z.array(extraPaymentConfigSchema).optional(),
  include_current_schedule: z.boolean().optional(),
});

export const mortgagesRouter = router({
  list: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input }) => {
      return getMortgagesByUser(ctx.user.id, input || {}, ctx.accessToken);
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    return getMortgageSummary(ctx.user.id, ctx.accessToken);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const mortgage = await getMortgageById(input.id, ctx.user.id, ctx.accessToken);

      if (!mortgage) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Financiamento não encontrado',
        });
      }

      return mortgage;
    }),

  create: protectedProcedure
    .input(createMortgageSchema)
    .mutation(async ({ ctx, input }) => {
      return createMortgage(ctx.user.id, input, ctx.accessToken);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateMortgageSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateMortgage(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar financiamento';
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
        await deleteMortgage(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover financiamento';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getInstallments: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        filters: installmentFiltersSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getInstallmentsByMortgage(input.mortgageId, ctx.user.id, input.filters || {}, ctx.accessToken);
    }),

  payInstallment: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        installmentNumber: z.number().positive(),
        data: payInstallmentSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await payInstallment(
          input.mortgageId,
          input.installmentNumber,
          ctx.user.id,
          input.data,
          ctx.accessToken
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao pagar parcela';
        if (message.includes('nao encontrad')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  getExtraPayments: protectedProcedure
    .input(z.object({ mortgageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getExtraPaymentsByMortgage(input.mortgageId, ctx.user.id, ctx.accessToken);
    }),

  createExtraPayment: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        data: createExtraPaymentSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createExtraPayment(input.mortgageId, ctx.user.id, input.data, ctx.accessToken);
    }),

  simulateExtraPayment: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        amount: z.number().positive(),
        paymentType: extraPaymentTypeEnum,
      })
    )
    .query(async ({ ctx, input }) => {
      return simulateExtraPaymentForMortgage(
        input.mortgageId,
        ctx.user.id,
        input.amount,
        input.paymentType,
        ctx.accessToken
      );
    }),

  simulateEarlyPayoff: protectedProcedure
    .input(z.object({ mortgageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return simulateEarlyPayoffForMortgage(input.mortgageId, ctx.user.id, ctx.accessToken);
    }),

  simulateAmortization: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        data: simulateAmortizationSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      return simulateAmortizationForMortgage(input.mortgageId, ctx.user.id, input.data, ctx.accessToken);
    }),

  getAnnualReport: protectedProcedure
    .input(
      z.object({
        mortgageId: z.string().uuid(),
        year: z.number().min(2000).max(2100),
      })
    )
    .query(async ({ ctx, input }) => {
      return getAnnualReport(input.mortgageId, input.year, ctx.user.id, ctx.accessToken);
    }),
});
