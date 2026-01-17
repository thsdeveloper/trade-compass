import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceGoal,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalFilters,
  GoalWithProgress,
  GoalSummary,
  GoalSelectItem,
} from '../../domain/finance-types.js';

const TABLE = 'finance_goals';

export async function getGoalsByUser(
  userId: string,
  filters: GoalFilters,
  accessToken: string
): Promise<GoalWithProgress[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(TABLE)
    .select(`
      *,
      linked_account:finance_accounts(*)
    `)
    .eq('user_id', userId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.goal_category) {
    query = query.eq('goal_category', filters.goal_category);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data: goals, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar objetivos: ${error.message}`);
  }

  // Calcular progresso para cada objetivo
  const goalsWithProgress = await Promise.all(
    (goals || []).map(async (goal) => {
      const { current_amount, contributions_count } = await getGoalContributions(
        goal.id,
        userId,
        accessToken
      );

      return {
        ...goal,
        current_amount,
        progress_percentage:
          goal.target_amount > 0
            ? Math.min((current_amount / goal.target_amount) * 100, 100)
            : 0,
        contributions_count,
      };
    })
  );

  return goalsWithProgress;
}

export async function getGoalById(
  goalId: string,
  userId: string,
  accessToken: string
): Promise<GoalWithProgress | null> {
  const client = createUserClient(accessToken);

  const { data: goal, error } = await client
    .from(TABLE)
    .select(`
      *,
      linked_account:finance_accounts(*)
    `)
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar objetivo: ${error.message}`);
  }

  const { current_amount, contributions_count } = await getGoalContributions(
    goalId,
    userId,
    accessToken
  );

  return {
    ...goal,
    current_amount,
    progress_percentage:
      goal.target_amount > 0
        ? Math.min((current_amount / goal.target_amount) * 100, 100)
        : 0,
    contributions_count,
  };
}

async function getGoalContributions(
  goalId: string,
  userId: string,
  accessToken: string
): Promise<{ current_amount: number; contributions_count: number }> {
  const client = createUserClient(accessToken);

  // Filtrar apenas RECEITA (lado destino da transferencia)
  // Contribuicoes sao transferencias para o objetivo
  const { data: transactions } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .eq('status', 'PAGO');

  const current_amount =
    transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const contributions_count = transactions?.length || 0;

  return { current_amount, contributions_count };
}

export async function createGoal(
  userId: string,
  goal: CreateGoalDTO,
  accessToken: string
): Promise<FinanceGoal> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: goal.name,
      description: goal.description || null,
      goal_category: goal.goal_category,
      target_amount: goal.target_amount,
      deadline: goal.deadline || null,
      priority: goal.priority || 'MEDIA',
      linked_account_id: goal.linked_account_id || null,
      icon: goal.icon || 'Target',
      color: goal.color || '#3b82f6',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar objetivo: ${error.message}`);
  }

  return data;
}

export async function updateGoal(
  goalId: string,
  userId: string,
  updates: UpdateGoalDTO,
  accessToken: string
): Promise<FinanceGoal> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar objetivo: ${error.message}`);
  }

  if (!data) {
    throw new Error('Objetivo nao encontrado');
  }

  return data;
}

export async function deleteGoal(
  goalId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Primeiro, remover vinculacoes de transacoes
  await client
    .from('finance_transactions')
    .update({ goal_id: null })
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  // Deletar objetivo
  const { error } = await client
    .from(TABLE)
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover objetivo: ${error.message}`);
  }
}

export async function getGoalSummary(
  userId: string,
  accessToken: string
): Promise<GoalSummary> {
  const client = createUserClient(accessToken);

  const { data: goals } = await client
    .from(TABLE)
    .select('id, target_amount, status')
    .eq('user_id', userId);

  if (!goals || goals.length === 0) {
    return {
      total_goals: 0,
      active_goals: 0,
      completed_goals: 0,
      total_target: 0,
      total_contributed: 0,
      overall_progress: 0,
    };
  }

  const activeGoals = goals.filter((g) => g.status === 'ATIVO');
  const completedGoals = goals.filter((g) => g.status === 'CONCLUIDO');
  const totalTarget = activeGoals.reduce(
    (sum, g) => sum + Number(g.target_amount),
    0
  );

  // Calcular total contribuido
  let totalContributed = 0;
  for (const goal of activeGoals) {
    const { current_amount } = await getGoalContributions(
      goal.id,
      userId,
      accessToken
    );
    totalContributed += current_amount;
  }

  return {
    total_goals: goals.length,
    active_goals: activeGoals.length,
    completed_goals: completedGoals.length,
    total_target: totalTarget,
    total_contributed: totalContributed,
    overall_progress: totalTarget > 0 ? (totalContributed / totalTarget) * 100 : 0,
  };
}

export async function getActiveGoalsForSelect(
  userId: string,
  accessToken: string
): Promise<GoalSelectItem[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('id, name, icon, color')
    .eq('user_id', userId)
    .eq('status', 'ATIVO')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar objetivos: ${error.message}`);
  }

  return data || [];
}

export async function getGoalContributionTransactions(
  goalId: string,
  userId: string,
  accessToken: string
): Promise<{ id: string; description: string; amount: number; due_date: string; status: string }[]> {
  const client = createUserClient(accessToken);

  // Filtrar apenas RECEITA (lado destino da transferencia)
  const { data, error } = await client
    .from('finance_transactions')
    .select('id, description, amount, due_date, status')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .neq('status', 'CANCELADO')
    .order('due_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar contribuicoes: ${error.message}`);
  }

  return data || [];
}
