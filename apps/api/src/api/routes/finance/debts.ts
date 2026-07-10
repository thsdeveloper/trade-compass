import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceDebt,
  FinanceDebtNegotiation,
  FinanceTransaction,
  DebtWithNegotiation,
  CreateDebtDTO,
  UpdateDebtDTO,
  CreateNegotiationDTO,
  UpdateNegotiationDTO,
  GenerateTransactionsDTO,
  DebtFilters,
  DebtSummary,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
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

export async function debtRoutes(app: FastifyInstance) {
  // GET /finance/debts/summary - Get debt summary
  app.get<{
    Reply: DebtSummary | ApiError;
  }>('/finance/debts/summary', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const summary = await getDebtSummary(user.id, accessToken);
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar resumo de dividas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/debts - List debts with filters
  app.get<{
    Querystring: DebtFilters;
    Reply: DebtWithNegotiation[] | ApiError;
  }>('/finance/debts', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const filters = request.query;

    try {
      const debts = await getDebtsByUser(user.id, filters, accessToken);
      return debts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dividas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/debts/:id - Get debt by ID
  app.get<{
    Params: { id: string };
    Reply: DebtWithNegotiation | ApiError;
  }>('/finance/debts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const debt = await getDebtById(id, user.id, accessToken);

      if (!debt) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Divida nao encontrada',
          statusCode: 404,
        });
      }

      return debt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar divida';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/debts - Create debt
  app.post<{
    Body: CreateDebtDTO;
    Reply: FinanceDebt | ApiError;
  }>('/finance/debts', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.creditor_name || !body.debt_type || !body.original_amount || !body.original_due_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome do credor, tipo, valor original e data de vencimento sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.original_amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor original deve ser maior que zero',
        statusCode: 400,
      });
    }

    try {
      const debt = await createDebt(user.id, body, accessToken);
      return reply.status(201).send(debt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar divida';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/debts/:id - Update debt
  app.patch<{
    Params: { id: string };
    Body: UpdateDebtDTO;
    Reply: FinanceDebt | ApiError;
  }>('/finance/debts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    try {
      const debt = await updateDebt(id, user.id, body, accessToken);
      return debt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar divida';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // DELETE /finance/debts/:id - Cancel debt
  app.delete<{
    Params: { id: string };
    Reply: { message: string } | ApiError;
  }>('/finance/debts/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteDebt(id, user.id, accessToken);
      return { message: 'Divida cancelada com sucesso' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar divida';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/debts/:id/negotiations - Get negotiations by debt
  app.get<{
    Params: { id: string };
    Reply: FinanceDebtNegotiation[] | ApiError;
  }>('/finance/debts/:id/negotiations', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const negotiations = await getNegotiationsByDebt(id, user.id, accessToken);
      return negotiations;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar negociacoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/debts/:id/negotiations - Create negotiation
  app.post<{
    Params: { id: string };
    Body: CreateNegotiationDTO;
    Reply: FinanceDebtNegotiation | ApiError;
  }>('/finance/debts/:id/negotiations', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id: debtId } = request.params;
    const body = request.body;

    if (!body.payment_method || !body.negotiated_value || !body.first_payment_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Metodo de pagamento, valor negociado e data do primeiro pagamento sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.negotiated_value <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor negociado deve ser maior que zero',
        statusCode: 400,
      });
    }

    if (body.payment_method === 'PARCELADO' && (!body.total_installments || body.total_installments < 2)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Parcelamento deve ter pelo menos 2 parcelas',
        statusCode: 400,
      });
    }

    try {
      const negotiation = await createNegotiation(user.id, debtId, body, accessToken);
      return reply.status(201).send(negotiation);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar negociacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/debts/:id/negotiations/:negId - Update negotiation
  app.patch<{
    Params: { id: string; negId: string };
    Body: UpdateNegotiationDTO;
    Reply: FinanceDebtNegotiation | ApiError;
  }>('/finance/debts/:id/negotiations/:negId', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id: debtId, negId } = request.params;
    const body = request.body;

    try {
      const negotiation = await updateNegotiation(debtId, negId, user.id, body, accessToken);
      return negotiation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar negociacao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/debts/:id/negotiations/:negId/generate-transactions - Generate transactions from negotiation
  app.post<{
    Params: { id: string; negId: string };
    Body: GenerateTransactionsDTO;
    Reply: FinanceTransaction[] | ApiError;
  }>('/finance/debts/:id/negotiations/:negId/generate-transactions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id: debtId, negId } = request.params;
    const body = request.body;

    if (!body.category_id || !body.account_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Categoria e conta sao obrigatorios',
        statusCode: 400,
      });
    }

    try {
      const transactions = await generateTransactionsFromNegotiation(
        user.id,
        debtId,
        negId,
        body,
        accessToken
      );
      return reply.status(201).send(transactions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar transacoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
