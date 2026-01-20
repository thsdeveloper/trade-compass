import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceGoal,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalFilters,
  GoalWithProgress,
  GoalSummary,
  GoalSelectItem,
  FinanceGoalStatus,
  FinanceGoalCategory,
  FinanceGoalPriority,
  FinanceGoalContribution,
  CreateGoalContributionDTO,
  UpdateGoalContributionDTO,
  GoalContributionItem,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getGoalsByUser,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalSummary,
  getActiveGoalsForSelect,
  getGoalContributionTransactions,
  getGoalContributionHistory,
  createGoalContribution,
  updateGoalContribution,
  deleteGoalContribution,
} from '../../../data/finance/goal-repository.js';

export async function goalRoutes(app: FastifyInstance) {
  // GET /finance/goals - List user goals
  app.get<{
    Querystring: {
      status?: FinanceGoalStatus;
      goal_category?: FinanceGoalCategory;
      priority?: FinanceGoalPriority;
      limit?: string;
      offset?: string;
    };
    Reply: GoalWithProgress[] | ApiError;
  }>('/finance/goals', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { status, goal_category, priority, limit, offset } = request.query;

    const filters: GoalFilters = {
      status,
      goal_category,
      priority,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    try {
      const goals = await getGoalsByUser(user.id, filters, accessToken);
      return goals;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar objetivos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/goals/summary - Get goals summary
  app.get<{
    Reply: GoalSummary | ApiError;
  }>('/finance/goals/summary', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const summary = await getGoalSummary(user.id, accessToken);
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

  // GET /finance/goals/select - List active goals for select dropdown
  app.get<{
    Reply: GoalSelectItem[] | ApiError;
  }>('/finance/goals/select', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const goals = await getActiveGoalsForSelect(user.id, accessToken);
      return goals;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar objetivos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/goals/:id - Get goal by ID
  app.get<{
    Params: { id: string };
    Reply: GoalWithProgress | ApiError;
  }>('/finance/goals/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const goal = await getGoalById(id, user.id, accessToken);

      if (!goal) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Objetivo nao encontrado',
          statusCode: 404,
        });
      }

      return goal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar objetivo';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/goals/:id/contributions - Get goal contributions
  app.get<{
    Params: { id: string };
    Reply: { id: string; description: string; amount: number; due_date: string; status: string }[] | ApiError;
  }>('/finance/goals/:id/contributions', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const contributions = await getGoalContributionTransactions(id, user.id, accessToken);
      return contributions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar contribuicoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/goals - Create goal
  app.post<{
    Body: CreateGoalDTO;
    Reply: FinanceGoal | ApiError;
  }>('/finance/goals', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.name || !body.target_amount) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome e valor alvo sao obrigatorios',
        statusCode: 400,
      });
    }

    try {
      const goal = await createGoal(user.id, body, accessToken);
      return reply.status(201).send(goal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar objetivo';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/goals/:id - Update goal
  app.patch<{
    Params: { id: string };
    Body: UpdateGoalDTO;
    Reply: FinanceGoal | ApiError;
  }>('/finance/goals/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      const goal = await updateGoal(id, user.id, updates, accessToken);
      return goal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar objetivo';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/goals/:id - Delete goal
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/goals/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteGoal(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover objetivo';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/goals/:id/contributions/history - Get unified contribution history
  app.get<{
    Params: { id: string };
    Reply: GoalContributionItem[] | ApiError;
  }>('/finance/goals/:id/contributions/history', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const history = await getGoalContributionHistory(id, user.id, accessToken);
      return history;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar historico';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/goals/:id/contributions - Create manual contribution
  app.post<{
    Params: { id: string };
    Body: CreateGoalContributionDTO;
    Reply: FinanceGoalContribution | ApiError;
  }>('/finance/goals/:id/contributions', async (request, reply) => {
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
        message: 'Data da contribuicao e obrigatoria',
        statusCode: 400,
      });
    }

    try {
      const contribution = await createGoalContribution(id, user.id, body, accessToken);
      return reply.status(201).send(contribution);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar contribuicao';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /finance/goals/:goalId/contributions/:id - Update manual contribution
  app.patch<{
    Params: { goalId: string; id: string };
    Body: UpdateGoalContributionDTO;
    Reply: FinanceGoalContribution | ApiError;
  }>('/finance/goals/:goalId/contributions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { goalId, id } = request.params;
    const body = request.body;

    if (body.amount !== undefined && body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor deve ser maior que zero',
        statusCode: 400,
      });
    }

    try {
      const contribution = await updateGoalContribution(id, goalId, user.id, body, accessToken);
      return contribution;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar contribuicao';
      const status = message.includes('nao encontrada') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/goals/:goalId/contributions/:id - Delete manual contribution
  app.delete<{
    Params: { goalId: string; id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/goals/:goalId/contributions/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { goalId, id } = request.params;

    try {
      await deleteGoalContribution(id, goalId, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover contribuicao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
