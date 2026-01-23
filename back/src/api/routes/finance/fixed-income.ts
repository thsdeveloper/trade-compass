import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceFixedIncome,
  FixedIncomeWithYield,
  CreateFixedIncomeDTO,
  UpdateFixedIncomeDTO,
  FixedIncomeFilters,
  FixedIncomeSummary,
  FixedIncomeType,
  FixedIncomeStatus,
  FixedIncomeRateType,
  FixedIncomeContribution,
  CreateFixedIncomeContributionDTO,
  UpdateFixedIncomeContributionDTO,
  FixedIncomeWithContributions,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getFixedIncomeByUser,
  getFixedIncomeById,
  createFixedIncome,
  updateFixedIncome,
  deleteFixedIncome,
  getFixedIncomeSummary,
  getFixedIncomeWithContributions,
  getContributionsByFixedIncome,
  createContribution,
  updateContribution,
  deleteContribution,
} from '../../../data/finance/fixed-income-repository.js';
import { getGoalById } from '../../../data/finance/goal-repository.js';

export async function fixedIncomeRoutes(app: FastifyInstance) {
  // GET /finance/fixed-income - List user fixed income investments with contribution stats
  app.get<{
    Querystring: {
      investment_type?: FixedIncomeType;
      status?: FixedIncomeStatus;
      rate_type?: FixedIncomeRateType;
      search?: string;
      limit?: string;
      offset?: string;
    };
    Reply: FixedIncomeWithContributions[] | ApiError;
  }>('/finance/fixed-income', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { investment_type, status, rate_type, search, limit, offset } = request.query;

    const filters: FixedIncomeFilters = {
      investment_type,
      status,
      rate_type,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    try {
      const investments = await getFixedIncomeWithContributions(user.id, filters, accessToken);
      return investments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar investimentos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/fixed-income/summary - Get fixed income summary
  app.get<{
    Reply: FixedIncomeSummary | ApiError;
  }>('/finance/fixed-income/summary', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const summary = await getFixedIncomeSummary(user.id, accessToken);
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

  // GET /finance/fixed-income/:id - Get fixed income by ID
  app.get<{
    Params: { id: string };
    Reply: FixedIncomeWithYield | ApiError;
  }>('/finance/fixed-income/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const investment = await getFixedIncomeById(id, user.id, accessToken);

      if (!investment) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Investimento nao encontrado',
          statusCode: 404,
        });
      }

      return investment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar investimento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/fixed-income - Create fixed income investment
  app.post<{
    Body: CreateFixedIncomeDTO;
    Reply: FinanceFixedIncome | ApiError;
  }>('/finance/fixed-income', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    // Validate required fields
    if (!body.investment_type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tipo de investimento e obrigatorio',
        statusCode: 400,
      });
    }

    if (!body.name) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome e obrigatorio',
        statusCode: 400,
      });
    }

    if (!body.issuer) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Emissor e obrigatorio',
        statusCode: 400,
      });
    }

    if (!body.rate_type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tipo de taxa e obrigatorio',
        statusCode: 400,
      });
    }

    if (body.rate_value === undefined || body.rate_value === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Taxa e obrigatoria',
        statusCode: 400,
      });
    }

    if (!body.amount_invested || body.amount_invested <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor investido deve ser maior que zero',
        statusCode: 400,
      });
    }

    if (!body.purchase_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data de compra e obrigatoria',
        statusCode: 400,
      });
    }

    if (!body.maturity_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data de vencimento e obrigatoria',
        statusCode: 400,
      });
    }

    // Validate maturity date is after purchase date
    if (new Date(body.maturity_date) <= new Date(body.purchase_date)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data de vencimento deve ser posterior a data de compra',
        statusCode: 400,
      });
    }

    // Validate goal_id if provided
    if (body.goal_id) {
      try {
        const goal = await getGoalById(body.goal_id, user.id, accessToken);
        if (!goal) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Objetivo nao encontrado',
            statusCode: 400,
          });
        }
        if (goal.status !== 'ATIVO') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Apenas objetivos ativos podem ser vinculados',
            statusCode: 400,
          });
        }
      } catch {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Erro ao validar objetivo',
          statusCode: 400,
        });
      }
    }

    try {
      const investment = await createFixedIncome(user.id, body, accessToken);
      return reply.status(201).send(investment);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar investimento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/fixed-income/:id - Update fixed income investment
  app.patch<{
    Params: { id: string };
    Body: UpdateFixedIncomeDTO;
    Reply: FinanceFixedIncome | ApiError;
  }>('/finance/fixed-income/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    // Validate amount if provided
    if (updates.amount_invested !== undefined && updates.amount_invested <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor investido deve ser maior que zero',
        statusCode: 400,
      });
    }

    // Validate goal_id if provided (allow null to remove link)
    if (updates.goal_id !== undefined && updates.goal_id !== null) {
      try {
        const goal = await getGoalById(updates.goal_id, user.id, accessToken);
        if (!goal) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Objetivo nao encontrado',
            statusCode: 400,
          });
        }
        if (goal.status !== 'ATIVO') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Apenas objetivos ativos podem ser vinculados',
            statusCode: 400,
          });
        }
      } catch {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Erro ao validar objetivo',
          statusCode: 400,
        });
      }
    }

    try {
      const investment = await updateFixedIncome(id, user.id, updates, accessToken);
      return investment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar investimento';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/fixed-income/:id - Delete (cancel) fixed income investment
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/fixed-income/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteFixedIncome(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir investimento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== CONTRIBUTIONS ====================

  // GET /finance/fixed-income/:id/contributions - Get contributions for an investment
  app.get<{
    Params: { id: string };
    Reply: FixedIncomeContribution[] | ApiError;
  }>('/finance/fixed-income/:id/contributions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const contributions = await getContributionsByFixedIncome(id, user.id, accessToken);
      return contributions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar aportes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/fixed-income/:id/contributions - Add contribution to investment
  app.post<{
    Params: { id: string };
    Body: CreateFixedIncomeContributionDTO;
    Reply: FixedIncomeContribution | ApiError;
  }>('/finance/fixed-income/:id/contributions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (!body.amount || body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor deve ser maior que zero',
        statusCode: 400,
      });
    }

    if (!body.contribution_date) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data do aporte e obrigatoria',
        statusCode: 400,
      });
    }

    try {
      const contribution = await createContribution(id, user.id, body, accessToken);
      return reply.status(201).send(contribution);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar aporte';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /finance/fixed-income/:fixedIncomeId/contributions/:id - Update contribution
  app.patch<{
    Params: { fixedIncomeId: string; id: string };
    Body: UpdateFixedIncomeContributionDTO;
    Reply: FixedIncomeContribution | ApiError;
  }>('/finance/fixed-income/:fixedIncomeId/contributions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { fixedIncomeId, id } = request.params;
    const body = request.body;

    if (body.amount !== undefined && body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor deve ser maior que zero',
        statusCode: 400,
      });
    }

    try {
      const contribution = await updateContribution(id, fixedIncomeId, user.id, body, accessToken);
      return contribution;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar aporte';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/fixed-income/:fixedIncomeId/contributions/:id - Delete contribution
  app.delete<{
    Params: { fixedIncomeId: string; id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/fixed-income/:fixedIncomeId/contributions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { fixedIncomeId, id } = request.params;

    try {
      await deleteContribution(id, fixedIncomeId, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir aporte';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
