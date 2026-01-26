import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc.js';
import {
  getTransactionsByUser,
  getTransactionById,
  createTransaction,
  createInstallmentTransactions,
  updateTransaction,
  payTransaction,
  cancelTransaction,
  cancelInstallmentGroup,
  cancelRecurrenceTransactionsFromDate,
  cancelAllRecurrenceTransactions,
  createTransfer,
  cancelTransfer,
  updateRecurrenceTransactions,
  updateInstallmentTransactions,
} from '../../../data/finance/transaction-repository.js';
import { deleteRecurrence } from '../../../data/finance/recurrence-repository.js';
import { getCreditCardById } from '../../../data/finance/credit-card-repository.js';

const transactionTypeEnum = z.enum(['RECEITA', 'DESPESA', 'TRANSFERENCIA']);
const transactionStatusEnum = z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']);
const scopeOptionEnum = z.enum(['only_this', 'this_and_future', 'all']);

const filtersSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
  type: transactionTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  search: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const createTransactionSchema = z.object({
  category_id: z.string().uuid('Categoria é obrigatória'),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  type: transactionTypeEnum,
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  due_date: z.string(),
  notes: z.string().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

const createInstallmentSchema = z.object({
  category_id: z.string().uuid('Categoria é obrigatória'),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  type: transactionTypeEnum,
  description: z.string().min(1, 'Descrição é obrigatória'),
  total_amount: z.number().positive('Valor total deve ser maior que zero'),
  total_installments: z.number().min(2).max(72, 'Número de parcelas deve estar entre 2 e 72'),
  first_due_date: z.string(),
  notes: z.string().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

const createTransferSchema = z.object({
  source_account_id: z.string().uuid('Conta de origem é obrigatória'),
  destination_account_id: z.string().uuid('Conta de destino é obrigatória'),
  category_id: z.string().uuid('Categoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  transfer_date: z.string(),
  notes: z.string().optional(),
  goal_id: z.string().uuid().optional(),
});

const updateTransactionSchema = z.object({
  type: transactionTypeEnum.optional(),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

const payTransactionSchema = z.object({
  paid_amount: z.number().positive().optional(),
  payment_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
});

export const transactionsRouter = router({
  list: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input }) => {
      return getTransactionsByUser(ctx.user.id, input || {}, ctx.accessToken);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const transaction = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      return transaction;
    }),

  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.account_id && input.credit_card_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Informe conta OU cartão, não ambos',
        });
      }

      if (input.type === 'RECEITA' && !input.account_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Receita deve ter uma conta de destino',
        });
      }

      if (input.type === 'DESPESA' && !input.account_id && !input.credit_card_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Despesa deve ter conta ou cartão de crédito',
        });
      }

      if (input.type === 'DESPESA' && input.credit_card_id) {
        const card = await getCreditCardById(input.credit_card_id, ctx.user.id, ctx.accessToken);
        if (!card) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cartão de crédito não encontrado',
          });
        }
        if (card.available_limit < input.amount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Limite insuficiente. Disponível: R$ ${card.available_limit.toFixed(2)}`,
          });
        }
      }

      return createTransaction(ctx.user.id, input, ctx.accessToken);
    }),

  createInstallments: protectedProcedure
    .input(createInstallmentSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.account_id && input.credit_card_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Informe conta OU cartão, não ambos',
        });
      }

      if (input.type === 'RECEITA' && !input.account_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Receita deve ter uma conta de destino',
        });
      }

      if (input.type === 'DESPESA' && !input.account_id && !input.credit_card_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Despesa deve ter conta ou cartão de crédito',
        });
      }

      if (input.type === 'DESPESA' && input.credit_card_id) {
        const card = await getCreditCardById(input.credit_card_id, ctx.user.id, ctx.accessToken);
        if (!card) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cartão de crédito não encontrado',
          });
        }
        if (card.available_limit < input.total_amount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Limite insuficiente. Disponível: R$ ${card.available_limit.toFixed(2)}`,
          });
        }
      }

      return createInstallmentTransactions(ctx.user.id, input, ctx.accessToken);
    }),

  createTransfer: protectedProcedure
    .input(createTransferSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.source_account_id === input.destination_account_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Conta de origem e destino devem ser diferentes',
        });
      }

      try {
        return await createTransfer(ctx.user.id, input, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar transferência';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  cancelTransfer: protectedProcedure
    .input(z.object({ transferId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await cancelTransfer(input.transferId, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao cancelar transferência';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateTransactionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      if (existing.status === 'PAGO') {
        const blockedFields = ['amount', 'account_id', 'credit_card_id', 'type', 'due_date'];
        const attemptedBlockedFields = blockedFields.filter(
          (field) => (input.data as any)[field] !== undefined
        );

        if (attemptedBlockedFields.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Transações pagas não podem ter os seguintes campos alterados: ${attemptedBlockedFields.join(', ')}`,
          });
        }
      }

      try {
        return await updateTransaction(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar transação';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  pay: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: payTransactionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await payTransaction(input.id, ctx.user.id, input.data, ctx.accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao pagar transação';
        if (message.includes('nao encontrada')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);
      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      if (transaction.transfer_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Para cancelar uma transferência, use cancelTransfer',
        });
      }

      if (transaction.status === 'PAGO') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transações já pagas não podem ser canceladas',
        });
      }

      try {
        await cancelTransaction(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao cancelar transação';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  cancelInstallmentGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await cancelInstallmentGroup(input.groupId, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao cancelar parcelas';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  updateRecurrence: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        option: scopeOptionEnum,
        data: updateTransactionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);
      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      if (!transaction.recurrence_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transação não pertence a uma recorrência',
        });
      }

      try {
        await updateRecurrenceTransactions(
          input.id,
          ctx.user.id,
          transaction.recurrence_id,
          transaction.due_date,
          transaction.status,
          input.data,
          input.option,
          ctx.accessToken
        );
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar transações';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  updateInstallment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        option: scopeOptionEnum,
        data: updateTransactionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);
      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      if (!transaction.installment_group_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transação não pertence a um parcelamento',
        });
      }

      try {
        await updateInstallmentTransactions(
          input.id,
          ctx.user.id,
          transaction.installment_group_id,
          transaction.due_date,
          transaction.status,
          input.data,
          input.option,
          ctx.accessToken
        );
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar parcelas';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),

  cancelRecurrence: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        option: scopeOptionEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await getTransactionById(input.id, ctx.user.id, ctx.accessToken);
      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      if (!transaction.recurrence_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transação não pertence a uma recorrência',
        });
      }

      try {
        switch (input.option) {
          case 'only_this':
            if (transaction.status === 'PAGO') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Transações já pagas não podem ser canceladas',
              });
            }
            await cancelTransaction(input.id, ctx.user.id, ctx.accessToken);
            break;

          case 'this_and_future':
            await cancelRecurrenceTransactionsFromDate(
              transaction.recurrence_id,
              ctx.user.id,
              transaction.due_date,
              ctx.accessToken
            );
            break;

          case 'all':
            await cancelAllRecurrenceTransactions(
              transaction.recurrence_id,
              ctx.user.id,
              ctx.accessToken
            );
            await deleteRecurrence(transaction.recurrence_id, ctx.user.id, ctx.accessToken);
            break;
        }

        return { success: true };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : 'Erro ao cancelar transação';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});
