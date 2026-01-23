import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceGoal,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalFilters,
  GoalWithProgress,
  GoalSummary,
  GoalSelectItem,
  FinanceGoalContribution,
  CreateGoalContributionDTO,
  UpdateGoalContributionDTO,
  GoalContributionItem,
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

  // Buscar transações vinculadas ao objetivo (qualquer tipo, status PAGO)
  // Para transferências, contamos apenas o lado RECEITA (destino)
  // Para DESPESA/RECEITA avulsa, contamos normalmente
  const { data: transactions } = await client
    .from('finance_transactions')
    .select('amount, type, transfer_id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('status', 'PAGO');

  // Calcular soma das transações
  // - DESPESA: soma ao progresso (representa pagamento feito para o objetivo)
  // - RECEITA: soma ao progresso (inclui lado destino de transferências)
  // - Para transferências, apenas o lado RECEITA é contado (evita duplicação)
  let transactionAmount = 0;
  let transactionCount = 0;

  if (transactions) {
    for (const t of transactions) {
      // Se for transferência, só conta o lado RECEITA
      if (t.transfer_id && t.type !== 'RECEITA') continue;
      transactionAmount += Number(t.amount);
      transactionCount++;
    }
  }

  // Buscar contribuições manuais
  const { data: manualContributions } = await client
    .from('finance_goal_contributions')
    .select('amount')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  const manualAmount =
    manualContributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const manualCount = manualContributions?.length || 0;

  // Buscar investimentos de renda fixa vinculados ao objetivo (ATIVO ou VENCIDO)
  // RESGATADO e CANCELADO não contam para evitar duplicidade se resgate virar transação
  const { data: investments } = await client
    .from('finance_fixed_income')
    .select('current_value, amount_invested, status')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .in('status', ['ATIVO', 'VENCIDO']);

  let investmentAmount = 0;
  let investmentCount = 0;
  if (investments) {
    for (const inv of investments) {
      // Usa current_value se disponível, senão amount_invested
      const value = inv.current_value !== null
        ? Number(inv.current_value)
        : Number(inv.amount_invested);
      investmentAmount += value;
      investmentCount++;
    }
  }

  return {
    current_amount: transactionAmount + manualAmount + investmentAmount,
    contributions_count: transactionCount + manualCount + investmentCount,
  };
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

  // Buscar transações vinculadas ao objetivo (qualquer tipo)
  // Para transferências, retornamos apenas o lado RECEITA
  const { data, error } = await client
    .from('finance_transactions')
    .select('id, description, amount, due_date, status, type, transfer_id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .neq('status', 'CANCELADO')
    .order('due_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar contribuicoes: ${error.message}`);
  }

  // Filtrar: para transferências, só retorna o lado RECEITA
  const filtered = (data || []).filter((t) => {
    if (t.transfer_id && t.type !== 'RECEITA') return false;
    return true;
  });

  return filtered.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    due_date: t.due_date,
    status: t.status,
  }));
}

// ==================== GOAL CONTRIBUTION CRUD ====================

export async function getGoalContributionHistory(
  goalId: string,
  userId: string,
  accessToken: string
): Promise<GoalContributionItem[]> {
  const client = createUserClient(accessToken);

  // Buscar transações vinculadas ao objetivo
  const { data: transactions } = await client
    .from('finance_transactions')
    .select('id, description, amount, due_date, status, type, transfer_id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  // Buscar contribuições manuais
  const { data: manualContributions } = await client
    .from('finance_goal_contributions')
    .select('id, description, amount, contribution_date')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  // Buscar investimentos de renda fixa vinculados ao objetivo
  const { data: investments } = await client
    .from('finance_fixed_income')
    .select('id, name, current_value, amount_invested, purchase_date, status')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  const items: GoalContributionItem[] = [];

  // Adicionar transações (filtrando lado DESPESA de transferências)
  if (transactions) {
    for (const t of transactions) {
      // Para transferências, só incluir o lado RECEITA
      if (t.transfer_id && t.type !== 'RECEITA') continue;

      items.push({
        id: t.id,
        type: 'transaction',
        amount: Number(t.amount),
        date: t.due_date,
        description: t.description,
        status: t.status,
      });
    }
  }

  // Adicionar contribuições manuais
  if (manualContributions) {
    for (const c of manualContributions) {
      items.push({
        id: c.id,
        type: 'manual',
        amount: Number(c.amount),
        date: c.contribution_date,
        description: c.description || 'Contribuicao manual',
      });
    }
  }

  // Adicionar investimentos de renda fixa
  if (investments) {
    for (const inv of investments) {
      // Usa current_value se disponível, senão amount_invested
      const value = inv.current_value !== null
        ? Number(inv.current_value)
        : Number(inv.amount_invested);

      items.push({
        id: inv.id,
        type: 'investment',
        amount: value,
        date: inv.purchase_date,
        description: inv.name,
        status: inv.status,
      });
    }
  }

  // Ordenar por data decrescente
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return items;
}

export async function createGoalContribution(
  goalId: string,
  userId: string,
  data: CreateGoalContributionDTO,
  accessToken: string
): Promise<FinanceGoalContribution> {
  const client = createUserClient(accessToken);

  // Verificar se o objetivo existe e pertence ao usuário
  const { data: goal, error: goalError } = await client
    .from('finance_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError || !goal) {
    throw new Error('Objetivo nao encontrado');
  }

  const { data: contribution, error } = await client
    .from('finance_goal_contributions')
    .insert({
      user_id: userId,
      goal_id: goalId,
      amount: data.amount,
      contribution_date: data.contribution_date,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar contribuicao: ${error.message}`);
  }

  return contribution;
}

export async function updateGoalContribution(
  contributionId: string,
  goalId: string,
  userId: string,
  data: UpdateGoalContributionDTO,
  accessToken: string
): Promise<FinanceGoalContribution> {
  const client = createUserClient(accessToken);

  const { data: contribution, error } = await client
    .from('finance_goal_contributions')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributionId)
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar contribuicao: ${error.message}`);
  }

  if (!contribution) {
    throw new Error('Contribuicao nao encontrada');
  }

  return contribution;
}

export async function deleteGoalContribution(
  contributionId: string,
  goalId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from('finance_goal_contributions')
    .delete()
    .eq('id', contributionId)
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao remover contribuicao: ${error.message}`);
  }
}
