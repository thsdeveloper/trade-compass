import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceTransaction,
  TransactionWithCategory,
  CreateTransactionDTO,
  CreateInstallmentTransactionDTO,
  UpdateTransactionDTO,
  PayTransactionDTO,
  TransactionFilters,
  CreateTransferDTO,
  TransferResult,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
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
} from '../../../data/finance/transaction-repository.js';
import { deleteRecurrence } from '../../../data/finance/recurrence-repository.js';
import { getCreditCardById } from '../../../data/finance/credit-card-repository.js';

export async function transactionRoutes(app: FastifyInstance) {
  // GET /finance/transactions - List transactions with filters
  app.get<{
    Querystring: TransactionFilters;
    Reply: TransactionWithCategory[] | ApiError;
  }>('/finance/transactions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const filters = request.query;

    try {
      const transactions = await getTransactionsByUser(user.id, filters, accessToken);
      return transactions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar transacoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/transactions/:id - Get transaction by ID
  app.get<{
    Params: { id: string };
    Reply: TransactionWithCategory | ApiError;
  }>('/finance/transactions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const transaction = await getTransactionById(id, user.id, accessToken);

      if (!transaction) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Transacao nao encontrada',
          statusCode: 404,
        });
      }

      return transaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar transacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/transactions - Create single transaction
  app.post<{
    Body: CreateTransactionDTO;
    Reply: FinanceTransaction | ApiError;
  }>('/finance/transactions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.category_id || !body.type || !body.description || !body.amount || !body.due_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Categoria, tipo, descricao, valor e data de vencimento sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.account_id && body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe conta OU cartao, nao ambos',
        statusCode: 400,
      });
    }

    // Validacao: forma de pagamento obrigatoria
    if (body.type === 'RECEITA' && !body.account_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Receita deve ter uma conta de destino',
        statusCode: 400,
      });
    }

    if (body.type === 'DESPESA' && !body.account_id && !body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Despesa deve ter conta ou cartao de credito',
        statusCode: 400,
      });
    }

    // Validacao: limite disponivel do cartao
    if (body.type === 'DESPESA' && body.credit_card_id) {
      const card = await getCreditCardById(body.credit_card_id, user.id, accessToken);
      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao de credito nao encontrado',
          statusCode: 404,
        });
      }
      if (card.available_limit < body.amount) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Limite insuficiente. Disponivel: R$ ${card.available_limit.toFixed(2)}`,
          statusCode: 400,
        });
      }
    }

    try {
      const transaction = await createTransaction(user.id, body, accessToken);
      return reply.status(201).send(transaction);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar transacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/transactions/installments - Create installment transactions
  app.post<{
    Body: CreateInstallmentTransactionDTO;
    Reply: FinanceTransaction[] | ApiError;
  }>('/finance/transactions/installments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (
      !body.category_id ||
      !body.type ||
      !body.description ||
      !body.total_amount ||
      !body.total_installments ||
      !body.first_due_date
    ) {
      return reply.status(400).send({
        error: 'Bad Request',
        message:
          'Categoria, tipo, descricao, valor total, numero de parcelas e primeira data sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.total_installments < 2 || body.total_installments > 72) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Numero de parcelas deve estar entre 2 e 72',
        statusCode: 400,
      });
    }

    if (body.account_id && body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe conta OU cartao, nao ambos',
        statusCode: 400,
      });
    }

    // Validacao: forma de pagamento obrigatoria
    if (body.type === 'RECEITA' && !body.account_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Receita deve ter uma conta de destino',
        statusCode: 400,
      });
    }

    if (body.type === 'DESPESA' && !body.account_id && !body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Despesa deve ter conta ou cartao de credito',
        statusCode: 400,
      });
    }

    // Validacao: limite disponivel do cartao (valor total do parcelamento)
    if (body.type === 'DESPESA' && body.credit_card_id) {
      const card = await getCreditCardById(body.credit_card_id, user.id, accessToken);
      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao de credito nao encontrado',
          statusCode: 404,
        });
      }
      if (card.available_limit < body.total_amount) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Limite insuficiente. Disponivel: R$ ${card.available_limit.toFixed(2)}`,
          statusCode: 400,
        });
      }
    }

    try {
      const transactions = await createInstallmentTransactions(user.id, body, accessToken);
      return reply.status(201).send(transactions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar parcelas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/transactions/transfer - Create transfer between accounts
  app.post<{
    Body: CreateTransferDTO;
    Reply: TransferResult | ApiError;
  }>('/finance/transactions/transfer', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    // Validacoes
    if (!body.source_account_id || !body.destination_account_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Conta de origem e destino sao obrigatorias',
        statusCode: 400,
      });
    }

    if (body.source_account_id === body.destination_account_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Conta de origem e destino devem ser diferentes',
        statusCode: 400,
      });
    }

    if (!body.category_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Categoria e obrigatoria',
        statusCode: 400,
      });
    }

    if (!body.description) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Descricao e obrigatoria',
        statusCode: 400,
      });
    }

    if (!body.amount || body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor deve ser maior que zero',
        statusCode: 400,
      });
    }

    if (!body.transfer_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data da transferencia e obrigatoria',
        statusCode: 400,
      });
    }

    try {
      const result = await createTransfer(user.id, body, accessToken);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar transferencia';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/transactions/transfer/:transferId - Cancel a transfer
  app.delete<{
    Params: { transferId: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/transactions/transfer/:transferId', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { transferId } = request.params;

    try {
      await cancelTransfer(transferId, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar transferencia';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/transactions/:id - Update transaction
  app.patch<{
    Params: { id: string };
    Body: UpdateTransactionDTO;
    Reply: FinanceTransaction | ApiError;
  }>('/finance/transactions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      // Buscar transacao para verificar status
      const existing = await getTransactionById(id, user.id, accessToken);
      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Transacao nao encontrada',
          statusCode: 404,
        });
      }

      // Se a transacao esta paga, bloquear campos criticos
      if (existing.status === 'PAGO') {
        const blockedFields = ['amount', 'account_id', 'credit_card_id', 'type', 'due_date'];
        const attemptedBlockedFields = blockedFields.filter(
          (field) => updates[field as keyof UpdateTransactionDTO] !== undefined
        );

        if (attemptedBlockedFields.length > 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Transacoes pagas nao podem ter os seguintes campos alterados: ${attemptedBlockedFields.join(', ')}. Apenas categoria, descricao e notas podem ser editados.`,
            statusCode: 400,
          });
        }
      }

      const transaction = await updateTransaction(id, user.id, updates, accessToken);
      return transaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar transacao';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /finance/transactions/:id/pay - Mark transaction as paid
  app.patch<{
    Params: { id: string };
    Body: PayTransactionDTO;
    Reply: FinanceTransaction | ApiError;
  }>('/finance/transactions/:id/pay', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const payment = request.body;

    try {
      const transaction = await payTransaction(id, user.id, payment, accessToken);
      return transaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao pagar transacao';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/transactions/:id - Cancel transaction
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/transactions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      // Verificar se a transacao existe
      const transaction = await getTransactionById(id, user.id, accessToken);
      if (!transaction) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Transacao nao encontrada',
          statusCode: 404,
        });
      }

      // Bloquear cancelamento individual de transacoes de transferencia
      if (transaction.transfer_id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Para cancelar uma transferencia, use DELETE /finance/transactions/transfer/:transferId',
          statusCode: 400,
        });
      }

      if (transaction.status === 'PAGO') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Transacoes ja pagas nao podem ser canceladas. Crie um estorno se necessario.',
          statusCode: 400,
        });
      }

      await cancelTransaction(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar transacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // DELETE /finance/transactions/installment-group/:groupId - Cancel all installments
  app.delete<{
    Params: { groupId: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/transactions/installment-group/:groupId', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { groupId } = request.params;

    try {
      await cancelInstallmentGroup(groupId, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar parcelas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // DELETE /finance/transactions/:id/recurrence - Cancel recurrence transaction(s) with options
  app.delete<{
    Params: { id: string };
    Body: { option: 'only_this' | 'this_and_future' | 'all' };
    Reply: { success: boolean } | ApiError;
  }>('/finance/transactions/:id/recurrence', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const { option } = request.body;

    try {
      // Buscar a transacao para obter recurrence_id e due_date
      const transaction = await getTransactionById(id, user.id, accessToken);
      if (!transaction) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Transacao nao encontrada',
          statusCode: 404,
        });
      }

      if (!transaction.recurrence_id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Transacao nao pertence a uma recorrencia',
          statusCode: 400,
        });
      }

      switch (option) {
        case 'only_this':
          // Validar se a transacao esta paga
          if (transaction.status === 'PAGO') {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Transacoes ja pagas nao podem ser canceladas. Crie um estorno se necessario.',
              statusCode: 400,
            });
          }
          // Cancela apenas esta transacao
          await cancelTransaction(id, user.id, accessToken);
          break;

        case 'this_and_future':
          // Cancela esta e todas as futuras
          await cancelRecurrenceTransactionsFromDate(
            transaction.recurrence_id,
            user.id,
            transaction.due_date,
            accessToken
          );
          break;

        case 'all':
          // Cancela todas as transacoes e desativa a recorrencia
          await cancelAllRecurrenceTransactions(
            transaction.recurrence_id,
            user.id,
            accessToken
          );
          await deleteRecurrence(transaction.recurrence_id, user.id, accessToken);
          break;

        default:
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Opcao invalida',
            statusCode: 400,
          });
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar transacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
