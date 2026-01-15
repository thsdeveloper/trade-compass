import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getFinanceSummary,
  getExpensesByCategory,
  getCashFlow,
  getUpcomingPayments,
} from '../../../data/finance/dashboard-repository.js';

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /finance/dashboard/summary - Get financial summary for a month
  app.get<{
    Querystring: { month?: string };
    Reply: FinanceSummary | ApiError;
  }>('/finance/dashboard/summary', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { month } = request.query;

    // Default to current month
    const targetMonth =
      month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mes deve estar no formato YYYY-MM',
        statusCode: 400,
      });
    }

    try {
      const summary = await getFinanceSummary(user.id, targetMonth, accessToken);
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar resumo';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/dashboard/by-category - Get expenses by category for a month
  app.get<{
    Querystring: { month?: string };
    Reply: ExpensesByCategory[] | ApiError;
  }>('/finance/dashboard/by-category', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { month } = request.query;

    // Default to current month
    const targetMonth =
      month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mes deve estar no formato YYYY-MM',
        statusCode: 400,
      });
    }

    try {
      const expenses = await getExpensesByCategory(user.id, targetMonth, accessToken);
      return expenses;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar gastos por categoria';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/dashboard/cash-flow - Get cash flow for past months
  app.get<{
    Querystring: { months?: number };
    Reply: CashFlowPoint[] | ApiError;
  }>('/finance/dashboard/cash-flow', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { months = 6 } = request.query;

    if (months < 1 || months > 12) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Numero de meses deve estar entre 1 e 12',
        statusCode: 400,
      });
    }

    try {
      const cashFlow = await getCashFlow(user.id, months, accessToken);
      return cashFlow;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar fluxo de caixa';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/dashboard/upcoming - Get upcoming payments
  app.get<{
    Querystring: { days?: number };
    Reply: UpcomingPayment[] | ApiError;
  }>('/finance/dashboard/upcoming', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { days = 30 } = request.query;

    if (days < 1 || days > 90) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Numero de dias deve estar entre 1 e 90',
        statusCode: 400,
      });
    }

    try {
      const upcoming = await getUpcomingPayments(user.id, days, accessToken);
      return upcoming;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar proximos vencimentos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
