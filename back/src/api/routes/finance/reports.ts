import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  CashFlowReportData,
  BudgetAnalysisReportData,
  CategoryBreakdownReportData,
  PaymentMethodsReportData,
  GoalsProgressReportData,
  RecurringAnalysisReportData,
  YoYComparisonReportData,
  ReportPeriod,
} from '../../../domain/report-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getCashFlowReport,
  getBudgetAnalysisReport,
  getCategoryBreakdownReport,
  getPaymentMethodsReport,
  getGoalsProgressReport,
  getRecurringAnalysisReport,
  getYoYComparisonReport,
} from '../../../data/finance/report-repository.js';

const VALID_PERIODS: ReportPeriod[] = ['3m', '6m', '12m'];

export async function reportsRoutes(app: FastifyInstance) {
  // GET /finance/reports/cash-flow - Cash flow report
  app.get<{
    Querystring: { period?: string; include_pending?: string };
    Reply: CashFlowReportData | ApiError;
  }>('/finance/reports/cash-flow', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { period = '6m', include_pending = 'true' } = request.query;

    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Periodo deve ser 3m, 6m ou 12m',
        statusCode: 400,
      });
    }

    try {
      const data = await getCashFlowReport(
        user.id,
        period as ReportPeriod,
        include_pending === 'true',
        accessToken
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio de fluxo de caixa';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/budget-analysis - Budget 50-30-20 analysis
  app.get<{
    Querystring: { period?: string; include_pending?: string };
    Reply: BudgetAnalysisReportData | ApiError;
  }>('/finance/reports/budget-analysis', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { period = '6m', include_pending = 'true' } = request.query;

    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Periodo deve ser 3m, 6m ou 12m',
        statusCode: 400,
      });
    }

    try {
      const data = await getBudgetAnalysisReport(
        user.id,
        period as ReportPeriod,
        include_pending === 'true',
        accessToken
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio de orcamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/category-breakdown - Expenses by category
  app.get<{
    Querystring: { period?: string; include_pending?: string };
    Reply: CategoryBreakdownReportData | ApiError;
  }>('/finance/reports/category-breakdown', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { period = '6m', include_pending = 'true' } = request.query;

    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Periodo deve ser 3m, 6m ou 12m',
        statusCode: 400,
      });
    }

    try {
      const data = await getCategoryBreakdownReport(
        user.id,
        period as ReportPeriod,
        include_pending === 'true',
        accessToken
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio por categoria';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/payment-methods - Payment methods analysis
  app.get<{
    Querystring: { period?: string; include_pending?: string };
    Reply: PaymentMethodsReportData | ApiError;
  }>('/finance/reports/payment-methods', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { period = '6m', include_pending = 'true' } = request.query;

    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Periodo deve ser 3m, 6m ou 12m',
        statusCode: 400,
      });
    }

    try {
      const data = await getPaymentMethodsReport(
        user.id,
        period as ReportPeriod,
        include_pending === 'true',
        accessToken
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio de meios de pagamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/goals-progress - Goals progress report
  app.get<{
    Reply: GoalsProgressReportData | ApiError;
  }>('/finance/reports/goals-progress', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await getGoalsProgressReport(user.id, accessToken);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio de objetivos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/recurring-analysis - Fixed vs variable expenses
  app.get<{
    Reply: RecurringAnalysisReportData | ApiError;
  }>('/finance/reports/recurring-analysis', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await getRecurringAnalysisReport(user.id, accessToken);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatorio de recorrencias';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/reports/yoy-comparison - Year over year comparison
  app.get<{
    Querystring: { years?: string };
    Reply: YoYComparisonReportData | ApiError;
  }>('/finance/reports/yoy-comparison', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { years } = request.query;

    const currentYear = new Date().getFullYear();
    let yearList: number[] = [currentYear, currentYear - 1];

    if (years) {
      yearList = years.split(',').map((y) => parseInt(y.trim())).filter((y) => !isNaN(y));
      if (yearList.length === 0 || yearList.length > 3) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Selecione de 1 a 3 anos para comparacao',
          statusCode: 400,
        });
      }
    }

    try {
      const data = await getYoYComparisonReport(user.id, yearList, accessToken);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar comparativo anual';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
