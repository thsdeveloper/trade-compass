import { createUserClient } from '../../lib/supabase.js';
import type {
  CashFlowReportData,
  CashFlowReportPoint,
  BudgetAnalysisReportData,
  BudgetAnalysisMonth,
  BudgetAllocationData,
  CategoryBreakdownReportData,
  CategoryBreakdownItem,
  TopCategoryTrend,
  PaymentMethodsReportData,
  PaymentMethodItem,
  CreditCardUsageItem,
  GoalsProgressReportData,
  GoalProgressItem,
  RecurringAnalysisReportData,
  RecurrenceItem,
  YoYComparisonReportData,
  YoYMonthData,
  YoYYearTotal,
} from '../../domain/report-types.js';
import type { BudgetCategory } from '../../domain/finance-types.js';

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const BUDGET_CATEGORY_CONFIG: Record<BudgetCategory, { label: string; ideal: number }> = {
  ESSENCIAL: { label: 'Essenciais', ideal: 50 },
  ESTILO_VIDA: { label: 'Estilo de Vida', ideal: 30 },
  INVESTIMENTO: { label: 'Investimentos', ideal: 20 },
};

/**
 * Parse a date string (YYYY-MM-DD) without timezone issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date to YYYY-MM-DD string without timezone issues
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all months between two dates
 */
function getMonthsBetweenDates(startDate: string, endDate: string): { month: string; startDate: string; endDate: string; label: string }[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const months: { month: string; startDate: string; endDate: string; label: string }[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Clamp to provided date range
    const effectiveStart = monthStart < start ? start : monthStart;
    const effectiveEnd = monthEnd > end ? end : monthEnd;

    months.push({
      month: monthKey,
      startDate: formatLocalDate(effectiveStart),
      endDate: formatLocalDate(effectiveEnd),
      label: MONTH_LABELS[month],
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Format period label from date range
 */
function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// ==================== CASH FLOW REPORT ====================

export async function getCashFlowReport(
  userId: string,
  startDate: string,
  endDate: string,
  includePending: boolean,
  accessToken: string
): Promise<CashFlowReportData> {
  const client = createUserClient(accessToken);
  const months = getMonthsBetweenDates(startDate, endDate);

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  const data: CashFlowReportPoint[] = [];
  let cumulativeBalance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  const statuses = includePending ? ['PAGO', 'PENDENTE'] : ['PAGO'];

  for (const monthInfo of months) {
    // Income - excluir transferencias e transacoes de contas BENEFICIO/INVESTIMENTO
    let incomeQuery = client
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'RECEITA')
      .is('transfer_id', null)
      .in('status', statuses)
      .gte('due_date', monthInfo.startDate)
      .lte('due_date', monthInfo.endDate);

    // Excluir transacoes de contas excluidas
    if (excludedAccountIds.length > 0) {
      incomeQuery = incomeQuery.or(
        `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
      );
    }

    const { data: incomeData } = await incomeQuery;
    const monthIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Expenses - excluir transferencias e transacoes de contas BENEFICIO/INVESTIMENTO
    let expenseQuery = client
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'DESPESA')
      .is('transfer_id', null)
      .in('status', statuses)
      .gte('due_date', monthInfo.startDate)
      .lte('due_date', monthInfo.endDate);

    // Excluir transacoes de contas excluidas
    if (excludedAccountIds.length > 0) {
      expenseQuery = expenseQuery.or(
        `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
      );
    }

    const { data: expenseData } = await expenseQuery;
    const monthExpenses = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const balance = monthIncome - monthExpenses;
    cumulativeBalance += balance;
    totalIncome += monthIncome;
    totalExpenses += monthExpenses;

    data.push({
      month: monthInfo.month,
      month_label: monthInfo.label,
      income: monthIncome,
      expenses: monthExpenses,
      balance,
      cumulative_balance: cumulativeBalance,
    });
  }

  const monthCount = months.length || 1;

  return {
    period: formatPeriodLabel(startDate, endDate),
    data,
    totals: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_balance: totalIncome - totalExpenses,
      average_monthly_income: totalIncome / monthCount,
      average_monthly_expenses: totalExpenses / monthCount,
    },
  };
}

// ==================== BUDGET ANALYSIS REPORT ====================

export async function getBudgetAnalysisReport(
  userId: string,
  startDate: string,
  endDate: string,
  includePending: boolean,
  accessToken: string
): Promise<BudgetAnalysisReportData> {
  const client = createUserClient(accessToken);
  const months = getMonthsBetweenDates(startDate, endDate);

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  const monthsData: BudgetAnalysisMonth[] = [];
  const categoryTotals: Record<BudgetCategory, number[]> = {
    ESSENCIAL: [],
    ESTILO_VIDA: [],
    INVESTIMENTO: [],
  };

  const statuses = includePending ? ['PAGO', 'PENDENTE'] : ['PAGO'];

  for (const monthInfo of months) {
    // Get income - excluir transferencias e receitas de contas BENEFICIO/INVESTIMENTO
    let incomeQuery = client
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'RECEITA')
      .is('transfer_id', null)
      .in('status', statuses)
      .gte('due_date', monthInfo.startDate)
      .lte('due_date', monthInfo.endDate);

    // Excluir transacoes de contas excluidas
    if (excludedAccountIds.length > 0) {
      incomeQuery = incomeQuery.or(
        `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
      );
    }

    const { data: incomeData } = await incomeQuery;
    const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Get expenses by budget category - excluir transferencias e contas excluidas
    let expenseQuery = client
      .from('finance_transactions')
      .select(`
        amount,
        category:finance_categories(budget_category)
      `)
      .eq('user_id', userId)
      .eq('type', 'DESPESA')
      .is('transfer_id', null)
      .in('status', statuses)
      .gte('due_date', monthInfo.startDate)
      .lte('due_date', monthInfo.endDate);

    if (excludedAccountIds.length > 0) {
      expenseQuery = expenseQuery.or(
        `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
      );
    }

    const { data: expenseData } = await expenseQuery;

    const budgetTotals: Record<BudgetCategory, number> = {
      ESSENCIAL: 0,
      ESTILO_VIDA: 0,
      INVESTIMENTO: 0,
    };

    for (const t of expenseData || []) {
      const cat = t.category as unknown as { budget_category: BudgetCategory | null } | null;
      const budgetCat = cat?.budget_category;
      if (budgetCat && budgetTotals[budgetCat] !== undefined) {
        budgetTotals[budgetCat] += Number(t.amount);
      }
    }

    const allocations: Record<BudgetCategory, BudgetAllocationData> = {} as Record<BudgetCategory, BudgetAllocationData>;

    for (const cat of Object.keys(BUDGET_CATEGORY_CONFIG) as BudgetCategory[]) {
      const amount = budgetTotals[cat];
      const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
      const idealPercentage = BUDGET_CATEGORY_CONFIG[cat].ideal;

      categoryTotals[cat].push(percentage);

      let status: 'on_track' | 'over_budget' | 'under_budget';
      if (Math.abs(percentage - idealPercentage) <= 5) {
        status = 'on_track';
      } else if (percentage > idealPercentage) {
        status = 'over_budget';
      } else {
        status = 'under_budget';
      }

      allocations[cat] = {
        amount,
        percentage,
        ideal_percentage: idealPercentage,
        status,
      };
    }

    monthsData.push({
      month: monthInfo.month,
      month_label: monthInfo.label,
      total_income: totalIncome,
      allocations: {
        essencial: allocations.ESSENCIAL,
        estilo_vida: allocations.ESTILO_VIDA,
        investimento: allocations.INVESTIMENTO,
      },
    });
  }

  const monthCount = months.length || 1;

  // Calculate averages and trend
  const avgEssencial = categoryTotals.ESSENCIAL.reduce((a, b) => a + b, 0) / monthCount;
  const avgEstiloVida = categoryTotals.ESTILO_VIDA.reduce((a, b) => a + b, 0) / monthCount;
  const avgInvestimento = categoryTotals.INVESTIMENTO.reduce((a, b) => a + b, 0) / monthCount;

  // Determine trend based on last half vs first half
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (monthsData.length >= 6) {
    const firstHalf = monthsData.slice(0, Math.floor(monthCount / 2));
    const secondHalf = monthsData.slice(Math.floor(monthCount / 2));

    const firstScore = firstHalf.reduce((sum, m) => {
      const e = Math.abs(m.allocations.essencial.percentage - 50);
      const ev = Math.abs(m.allocations.estilo_vida.percentage - 30);
      const i = Math.abs(m.allocations.investimento.percentage - 20);
      return sum + e + ev + i;
    }, 0) / firstHalf.length;

    const secondScore = secondHalf.reduce((sum, m) => {
      const e = Math.abs(m.allocations.essencial.percentage - 50);
      const ev = Math.abs(m.allocations.estilo_vida.percentage - 30);
      const i = Math.abs(m.allocations.investimento.percentage - 20);
      return sum + e + ev + i;
    }, 0) / secondHalf.length;

    if (secondScore < firstScore - 5) {
      trend = 'improving';
    } else if (secondScore > firstScore + 5) {
      trend = 'worsening';
    }
  }

  return {
    period: formatPeriodLabel(startDate, endDate),
    months: monthsData,
    average: {
      essencial: avgEssencial,
      estilo_vida: avgEstiloVida,
      investimento: avgInvestimento,
    },
    trend,
  };
}

// ==================== CATEGORY BREAKDOWN REPORT ====================

export async function getCategoryBreakdownReport(
  userId: string,
  startDate: string,
  endDate: string,
  includePending: boolean,
  accessToken: string
): Promise<CategoryBreakdownReportData> {
  const client = createUserClient(accessToken);
  const statuses = includePending ? ['PAGO', 'PENDENTE'] : ['PAGO'];

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  // Get expenses by category - excluir transferencias e contas excluidas
  let query = client
    .from('finance_transactions')
    .select(`
      id,
      amount,
      due_date,
      category:finance_categories(id, name, icon, color)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .is('transfer_id', null)
    .in('status', statuses)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    query = query.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: transactions } = await query;

  if (!transactions || transactions.length === 0) {
    return {
      period: formatPeriodLabel(startDate, endDate),
      categories: [],
      top_categories: [],
      total_expenses: 0,
    };
  }

  // Group by category
  const categoryTotals: Record<string, {
    name: string;
    icon: string;
    color: string;
    total: number;
    count: number;
    monthly: Record<string, number>;
  }> = {};

  let totalExpenses = 0;

  for (const t of transactions) {
    const catData = t.category as unknown;
    const cat = (Array.isArray(catData) ? catData[0] : catData) as { id: string; name: string; icon: string; color: string } | null;
    if (!cat) continue;

    const amount = Number(t.amount);
    totalExpenses += amount;
    const monthKey = t.due_date.substring(0, 7);

    if (!categoryTotals[cat.id]) {
      categoryTotals[cat.id] = {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        total: 0,
        count: 0,
        monthly: {},
      };
    }

    categoryTotals[cat.id].total += amount;
    categoryTotals[cat.id].count += 1;
    categoryTotals[cat.id].monthly[monthKey] = (categoryTotals[cat.id].monthly[monthKey] || 0) + amount;
  }

  // Convert to array and sort
  const categories: CategoryBreakdownItem[] = Object.entries(categoryTotals)
    .map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      category_icon: data.icon,
      category_color: data.color,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  // Top 5 categories trend
  const topCategories: TopCategoryTrend[] = categories.slice(0, 5).map((cat) => {
    const catData = categoryTotals[cat.category_id];
    const monthlyData = Object.entries(catData.monthly)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      category_id: cat.category_id,
      category_name: cat.category_name,
      category_color: cat.category_color,
      monthly_data: monthlyData,
    };
  });

  // Compare with previous period (same duration before start date)
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const duration = end.getTime() - start.getTime();

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);

  const { data: prevTransactions } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .in('status', statuses)
    .gte('due_date', formatLocalDate(prevStart))
    .lte('due_date', formatLocalDate(prevEnd));

  const previousTotal = prevTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return {
    period: formatPeriodLabel(startDate, endDate),
    categories,
    top_categories: topCategories,
    total_expenses: totalExpenses,
    comparison: previousTotal > 0 ? {
      previous_period_total: previousTotal,
      change_percentage: ((totalExpenses - previousTotal) / previousTotal) * 100,
    } : undefined,
  };
}

// ==================== PAYMENT METHODS REPORT ====================

export async function getPaymentMethodsReport(
  userId: string,
  startDate: string,
  endDate: string,
  includePending: boolean,
  accessToken: string
): Promise<PaymentMethodsReportData> {
  const client = createUserClient(accessToken);
  const statuses = includePending ? ['PAGO', 'PENDENTE'] : ['PAGO'];

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  // Get transactions with account/credit card - excluir transferencias e contas excluidas
  let query = client
    .from('finance_transactions')
    .select(`
      amount,
      account_id,
      credit_card_id,
      account:finance_accounts(id, name, color),
      credit_card:finance_credit_cards(id, name, brand, color, total_limit)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .is('transfer_id', null)
    .in('status', statuses)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    query = query.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: transactions } = await query;

  const accountTotals: Record<string, { name: string; color: string; total: number; count: number }> = {};
  const cardTotals: Record<string, { name: string; brand: string; color: string; total_limit: number; total: number; count: number }> = {};

  let totalAccountPayments = 0;
  let totalCardPayments = 0;

  for (const t of transactions || []) {
    const amount = Number(t.amount);

    if (t.credit_card_id && t.credit_card) {
      const cardData = t.credit_card as unknown;
      const card = (Array.isArray(cardData) ? cardData[0] : cardData) as { id: string; name: string; brand: string; color: string; total_limit: number } | null;
      if (!card) continue;
      totalCardPayments += amount;

      if (!cardTotals[card.id]) {
        cardTotals[card.id] = {
          name: card.name,
          brand: card.brand,
          color: card.color,
          total_limit: card.total_limit,
          total: 0,
          count: 0,
        };
      }
      cardTotals[card.id].total += amount;
      cardTotals[card.id].count += 1;
    } else if (t.account_id && t.account) {
      const accountData = t.account as unknown;
      const account = (Array.isArray(accountData) ? accountData[0] : accountData) as { id: string; name: string; color: string } | null;
      if (!account) continue;
      totalAccountPayments += amount;

      if (!accountTotals[account.id]) {
        accountTotals[account.id] = {
          name: account.name,
          color: account.color,
          total: 0,
          count: 0,
        };
      }
      accountTotals[account.id].total += amount;
      accountTotals[account.id].count += 1;
    }
  }

  const totalPayments = totalAccountPayments + totalCardPayments;

  const accounts: PaymentMethodItem[] = Object.entries(accountTotals)
    .map(([id, data]) => ({
      id,
      name: data.name,
      color: data.color,
      total: data.total,
      percentage: totalAccountPayments > 0 ? (data.total / totalAccountPayments) * 100 : 0,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  const creditCards: CreditCardUsageItem[] = Object.entries(cardTotals)
    .map(([id, data]) => ({
      id,
      name: data.name,
      brand: data.brand,
      color: data.color,
      total_limit: data.total_limit,
      used_amount: data.total,
      usage_percentage: data.total_limit > 0 ? (data.total / data.total_limit) * 100 : 0,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.used_amount - a.used_amount);

  return {
    period: formatPeriodLabel(startDate, endDate),
    summary: {
      total_account_payments: totalAccountPayments,
      total_card_payments: totalCardPayments,
      account_percentage: totalPayments > 0 ? (totalAccountPayments / totalPayments) * 100 : 0,
      card_percentage: totalPayments > 0 ? (totalCardPayments / totalPayments) * 100 : 0,
    },
    accounts,
    credit_cards: creditCards,
  };
}

// ==================== GOALS PROGRESS REPORT ====================

export async function getGoalsProgressReport(
  userId: string,
  accessToken: string
): Promise<GoalsProgressReportData> {
  const client = createUserClient(accessToken);

  // Get goals with contributions
  const { data: goals } = await client
    .from('finance_goals')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['ATIVO', 'CONCLUIDO'])
    .order('created_at', { ascending: false });

  if (!goals || goals.length === 0) {
    return {
      goals: [],
      summary: {
        total_goals: 0,
        active_goals: 0,
        completed_goals: 0,
        at_risk_goals: 0,
        total_target: 0,
        total_contributed: 0,
        overall_progress: 0,
      },
    };
  }

  const goalItems: GoalProgressItem[] = [];
  let totalTarget = 0;
  let totalContributed = 0;
  let activeGoals = 0;
  let completedGoals = 0;
  let atRiskGoals = 0;

  for (const goal of goals) {
    // Get contributions from transactions linked to this goal
    const { data: transactionContributions } = await client
      .from('finance_transactions')
      .select('amount, due_date')
      .eq('goal_id', goal.id)
      .eq('status', 'PAGO')
      .order('due_date', { ascending: true });

    // Get manual contributions from finance_goal_contributions
    const { data: manualContributions } = await client
      .from('finance_goal_contributions')
      .select('amount, contribution_date')
      .eq('goal_id', goal.id)
      .order('contribution_date', { ascending: true });

    // Combine all contributions
    const allContributions: { amount: number; date: string }[] = [];

    for (const c of transactionContributions || []) {
      allContributions.push({ amount: Number(c.amount), date: c.due_date });
    }

    for (const c of manualContributions || []) {
      allContributions.push({ amount: Number(c.amount), date: c.contribution_date });
    }

    const currentAmount = allContributions.reduce((sum, c) => sum + c.amount, 0);
    const progressPercentage = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;

    totalTarget += goal.target_amount;
    totalContributed += currentAmount;

    if (goal.status === 'ATIVO') activeGoals++;
    if (goal.status === 'CONCLUIDO') completedGoals++;

    // Check if at risk (deadline approaching and progress < expected)
    let isAtRisk = false;
    let projectedCompletion: string | null = null;

    if (goal.deadline && goal.status === 'ATIVO') {
      const deadlineDate = new Date(goal.deadline);
      const now = new Date();
      const totalDays = (deadlineDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays = (now.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const expectedProgress = (elapsedDays / totalDays) * 100;

      if (progressPercentage < expectedProgress - 10 && deadlineDate > now) {
        isAtRisk = true;
        atRiskGoals++;
      }

      // Project completion based on current pace
      if (currentAmount > 0 && allContributions.length > 0) {
        const daysSinceStart = elapsedDays;
        const dailyRate = currentAmount / daysSinceStart;
        const remaining = goal.target_amount - currentAmount;
        const daysToComplete = remaining / dailyRate;
        const completionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        projectedCompletion = formatLocalDate(completionDate);
      }
    }

    // Group contributions by month
    const monthlyContributions: Record<string, number> = {};
    for (const c of allContributions) {
      const month = c.date.substring(0, 7);
      monthlyContributions[month] = (monthlyContributions[month] || 0) + c.amount;
    }

    goalItems.push({
      id: goal.id,
      name: goal.name,
      icon: goal.icon,
      color: goal.color,
      target_amount: goal.target_amount,
      current_amount: currentAmount,
      progress_percentage: Math.min(progressPercentage, 100),
      deadline: goal.deadline,
      status: goal.status,
      is_at_risk: isAtRisk,
      projected_completion: projectedCompletion,
      monthly_contributions: Object.entries(monthlyContributions)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  }

  return {
    goals: goalItems,
    summary: {
      total_goals: goals.length,
      active_goals: activeGoals,
      completed_goals: completedGoals,
      at_risk_goals: atRiskGoals,
      total_target: totalTarget,
      total_contributed: totalContributed,
      overall_progress: totalTarget > 0 ? (totalContributed / totalTarget) * 100 : 0,
    },
  };
}

// ==================== RECURRING ANALYSIS REPORT ====================

export async function getRecurringAnalysisReport(
  userId: string,
  accessToken: string
): Promise<RecurringAnalysisReportData> {
  const client = createUserClient(accessToken);

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  // Get all recurrences
  const { data: recurrences } = await client
    .from('finance_recurrences')
    .select(`
      id,
      description,
      amount,
      frequency,
      type,
      is_active,
      category:finance_categories(name, icon, color)
    `)
    .eq('user_id', userId)
    .order('amount', { ascending: false });

  // Get current month income for commitment calculation
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startDate = `${month}-01`;
  const endDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Excluir transferencias e contas excluidas
  let incomeQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .is('transfer_id', null)
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    incomeQuery = incomeQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: incomeData } = await incomeQuery;

  const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  let totalFixed = 0;
  let totalVariable = 0;
  let activeRecurrences = 0;

  const recurrenceItems: RecurrenceItem[] = (recurrences || []).map((r) => {
    const catData = r.category as unknown;
    const cat = (Array.isArray(catData) ? catData[0] : catData) as { name: string; icon: string; color: string } | null;

    if (r.is_active && r.type === 'DESPESA') {
      totalFixed += Number(r.amount);
      activeRecurrences++;
    }

    return {
      id: r.id,
      description: r.description,
      amount: Number(r.amount),
      frequency: r.frequency,
      category_name: cat?.name || 'Sem categoria',
      category_icon: cat?.icon || 'Circle',
      category_color: cat?.color || '#6B7280',
      is_active: r.is_active,
      type: r.type,
    };
  });

  // Calculate variable expenses (total expenses - fixed) - excluir transferencias e contas excluidas
  let expenseQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .is('transfer_id', null)
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    expenseQuery = expenseQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: allExpenses } = await expenseQuery;

  const totalExpenses = allExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  totalVariable = Math.max(0, totalExpenses - totalFixed);

  const totalAll = totalFixed + totalVariable;

  return {
    summary: {
      total_fixed: totalFixed,
      total_variable: totalVariable,
      fixed_percentage: totalAll > 0 ? (totalFixed / totalAll) * 100 : 0,
      variable_percentage: totalAll > 0 ? (totalVariable / totalAll) * 100 : 0,
      total_recurrences: recurrences?.length || 0,
      active_recurrences: activeRecurrences,
    },
    recurrences: recurrenceItems,
    income_commitment: totalIncome > 0 ? (totalFixed / totalIncome) * 100 : 0,
  };
}

// ==================== YOY COMPARISON REPORT ====================

export async function getYoYComparisonReport(
  userId: string,
  years: number[],
  accessToken: string
): Promise<YoYComparisonReportData> {
  const client = createUserClient(accessToken);

  // Buscar IDs de contas BENEFICIO e INVESTIMENTO para excluir do calculo
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['BENEFICIO', 'INVESTIMENTO']);

  const excludedAccountIds = (excludedAccounts || []).map((a) => a.id);

  const sortedYears = [...years].sort((a, b) => a - b);
  const monthlyComparison: YoYMonthData[] = [];
  const yearlyTotals: YoYYearTotal[] = [];

  // Initialize monthly data structure
  for (let month = 1; month <= 12; month++) {
    const monthData: YoYMonthData = {
      month,
      month_label: MONTH_LABELS[month - 1],
      data: {},
    };

    for (const year of sortedYears) {
      monthData.data[year] = {
        income: 0,
        expenses: 0,
        balance: 0,
      };
    }

    monthlyComparison.push(monthData);
  }

  // Fetch data for each year - excluir transferencias e contas excluidas
  for (const year of sortedYears) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = client
      .from('finance_transactions')
      .select('type, amount, due_date')
      .eq('user_id', userId)
      .is('transfer_id', null)
      .in('status', ['PAGO', 'PENDENTE'])
      .gte('due_date', startDate)
      .lte('due_date', endDate);

    if (excludedAccountIds.length > 0) {
      query = query.or(
        `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
      );
    }

    const { data: transactions } = await query;

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions || []) {
      const amount = Number(t.amount);
      const monthNum = parseInt(t.due_date.substring(5, 7));
      const monthIndex = monthNum - 1;

      if (t.type === 'RECEITA') {
        totalIncome += amount;
        monthlyComparison[monthIndex].data[year].income += amount;
      } else if (t.type === 'DESPESA') {
        totalExpenses += amount;
        monthlyComparison[monthIndex].data[year].expenses += amount;
      }
    }

    // Calculate balances
    for (const monthData of monthlyComparison) {
      monthData.data[year].balance = monthData.data[year].income - monthData.data[year].expenses;
    }

    yearlyTotals.push({
      year,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_balance: totalIncome - totalExpenses,
      average_monthly_income: totalIncome / 12,
      average_monthly_expenses: totalExpenses / 12,
    });
  }

  return {
    years: sortedYears,
    monthly_comparison: monthlyComparison,
    yearly_totals: yearlyTotals,
  };
}
