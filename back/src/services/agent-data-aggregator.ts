import { getAccountsByUser } from '../data/finance/account-repository.js';
import { getCreditCardsByUser } from '../data/finance/credit-card-repository.js';
import { getGoalsByUser, getGoalSummary } from '../data/finance/goal-repository.js';
import { getDebtsByUser, getDebtSummary } from '../data/finance/debt-repository.js';
import {
  getFinanceSummary,
  getUpcomingPayments,
  getCashFlow,
} from '../data/finance/dashboard-repository.js';
import { getTransactionsByUser } from '../data/finance/transaction-repository.js';

export interface FinancialContext {
  summary: {
    totalBalance: number;
    benefitBalance: number;
    pendingExpenses: number;
    pendingIncome: number;
    monthResult: number;
    monthExpenses: number;
    monthIncome: number;
  };
  accounts: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
  creditCards: Array<{
    name: string;
    brand: string;
    totalLimit: number;
    availableLimit: number;
    usedLimit: number;
    closingDay: number;
    dueDay: number;
  }>;
  recentTransactions: Array<{
    description: string;
    amount: number;
    date: string;
    type: string;
    status: string;
    category: string | null;
  }>;
  upcomingPayments: Array<{
    description: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
  }>;
  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    progressPercentage: number;
    status: string;
  }>;
  goalsSummary: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTarget: number;
    totalContributed: number;
    overallProgress: number;
  };
  debts: Array<{
    creditorName: string;
    originalAmount: number;
    updatedAmount: number;
    status: string;
    debtType: string;
  }>;
  debtsSummary: {
    totalDebts: number;
    totalOpenAmount: number;
    totalNegotiatedAmount: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    balance: number;
  }>;
  currentMonth: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getFinancialContext(
  userId: string,
  accessToken: string
): Promise<FinancialContext> {
  const currentMonth = getCurrentMonth();

  // Fetch all data in parallel for efficiency
  const [
    financeSummary,
    accounts,
    creditCards,
    recentTransactions,
    upcomingPaymentsData,
    goals,
    goalsSummary,
    debts,
    debtsSummary,
    cashFlow,
  ] = await Promise.all([
    getFinanceSummary(userId, currentMonth, accessToken),
    getAccountsByUser(userId, accessToken),
    getCreditCardsByUser(userId, accessToken),
    getTransactionsByUser(
      userId,
      {
        limit: 15,
      },
      accessToken
    ),
    getUpcomingPayments(userId, 14, accessToken),
    getGoalsByUser(userId, { status: 'ATIVO' }, accessToken),
    getGoalSummary(userId, accessToken),
    getDebtsByUser(userId, {}, accessToken),
    getDebtSummary(userId, accessToken),
    getCashFlow(userId, 6, accessToken),
  ]);

  return {
    summary: {
      totalBalance: financeSummary.total_balance,
      benefitBalance: financeSummary.benefit_balance,
      pendingExpenses: financeSummary.total_pending_expenses,
      pendingIncome: financeSummary.total_pending_income,
      monthResult: financeSummary.month_result,
      monthExpenses: financeSummary.month_expenses,
      monthIncome: financeSummary.month_income,
    },
    accounts: accounts.map((acc) => ({
      name: acc.name,
      balance: acc.current_balance,
      type: acc.type,
    })),
    creditCards: creditCards.map((card) => ({
      name: card.name,
      brand: card.brand,
      totalLimit: card.total_limit,
      availableLimit: card.available_limit,
      usedLimit: card.total_limit - card.available_limit,
      closingDay: card.closing_day,
      dueDay: card.due_day,
    })),
    recentTransactions: recentTransactions.map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      date: tx.due_date,
      type: tx.type,
      status: tx.status,
      category: tx.category?.name || null,
    })),
    upcomingPayments: upcomingPaymentsData.map((payment) => ({
      description: payment.description,
      amount: payment.amount,
      dueDate: payment.due_date,
      daysUntilDue: payment.days_until_due,
    })),
    goals: goals.map((goal) => ({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      progressPercentage: goal.progress_percentage,
      status: goal.status,
    })),
    goalsSummary: {
      totalGoals: goalsSummary.total_goals,
      activeGoals: goalsSummary.active_goals,
      completedGoals: goalsSummary.completed_goals,
      totalTarget: goalsSummary.total_target,
      totalContributed: goalsSummary.total_contributed,
      overallProgress: goalsSummary.overall_progress,
    },
    debts: debts.map((debt) => ({
      creditorName: debt.creditor_name,
      originalAmount: debt.original_amount,
      updatedAmount: debt.updated_amount,
      status: debt.status,
      debtType: debt.debt_type,
    })),
    debtsSummary: {
      totalDebts: debtsSummary.total_debts,
      totalOpenAmount: debtsSummary.total_open_amount,
      totalNegotiatedAmount: debtsSummary.total_negotiated_amount,
    },
    monthlyTrend: cashFlow.map((point) => ({
      month: point.month,
      income: point.income,
      expenses: point.expenses,
      balance: point.balance,
    })),
    currentMonth,
  };
}

export function formatFinancialContextForPrompt(context: FinancialContext): string {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const lines: string[] = [];

  // Summary
  lines.push('=== RESUMO FINANCEIRO ===');
  lines.push(`Mes de referencia: ${context.currentMonth}`);
  lines.push(`Saldo total em contas: ${formatCurrency(context.summary.totalBalance)}`);
  if (context.summary.benefitBalance > 0) {
    lines.push(`Saldo em beneficios: ${formatCurrency(context.summary.benefitBalance)}`);
  }
  lines.push(`Despesas pendentes do mes: ${formatCurrency(context.summary.pendingExpenses)}`);
  lines.push(`Receitas pendentes do mes: ${formatCurrency(context.summary.pendingIncome)}`);
  lines.push(`Resultado do mes: ${formatCurrency(context.summary.monthResult)}`);
  lines.push(`Total receitas do mes: ${formatCurrency(context.summary.monthIncome)}`);
  lines.push(`Total despesas do mes: ${formatCurrency(context.summary.monthExpenses)}`);
  lines.push('');

  // Accounts
  if (context.accounts.length > 0) {
    lines.push('=== CONTAS ===');
    for (const acc of context.accounts) {
      lines.push(`- ${acc.name} (${acc.type}): ${formatCurrency(acc.balance)}`);
    }
    lines.push('');
  }

  // Credit Cards
  if (context.creditCards.length > 0) {
    lines.push('=== CARTOES DE CREDITO ===');
    for (const card of context.creditCards) {
      lines.push(
        `- ${card.name} (${card.brand}): Limite ${formatCurrency(card.totalLimit)}, ` +
        `Usado ${formatCurrency(card.usedLimit)}, Disponivel ${formatCurrency(card.availableLimit)}, ` +
        `Fecha dia ${card.closingDay}, Vence dia ${card.dueDay}`
      );
    }
    lines.push('');
  }

  // Upcoming Payments
  if (context.upcomingPayments.length > 0) {
    lines.push('=== PROXIMOS VENCIMENTOS (14 dias) ===');
    for (const payment of context.upcomingPayments) {
      const daysText =
        payment.daysUntilDue === 0
          ? 'HOJE'
          : payment.daysUntilDue === 1
            ? 'amanha'
            : `em ${payment.daysUntilDue} dias`;
      lines.push(`- ${payment.description}: ${formatCurrency(payment.amount)} (${daysText})`);
    }
    lines.push('');
  }

  // Recent Transactions
  if (context.recentTransactions.length > 0) {
    lines.push('=== TRANSACOES RECENTES ===');
    for (const tx of context.recentTransactions) {
      const sign = tx.type === 'RECEITA' ? '+' : '-';
      const categoryInfo = tx.category ? ` [${tx.category}]` : '';
      lines.push(
        `- ${tx.date}: ${tx.description} ${sign}${formatCurrency(tx.amount)} (${tx.status})${categoryInfo}`
      );
    }
    lines.push('');
  }

  // Goals
  if (context.goals.length > 0) {
    lines.push('=== OBJETIVOS FINANCEIROS ===');
    lines.push(
      `Resumo: ${context.goalsSummary.activeGoals} ativos, ` +
      `${context.goalsSummary.completedGoals} concluidos, ` +
      `${context.goalsSummary.overallProgress.toFixed(1)}% de progresso geral`
    );
    for (const goal of context.goals) {
      lines.push(
        `- ${goal.name}: ${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.targetAmount)} ` +
        `(${goal.progressPercentage.toFixed(1)}%)`
      );
    }
    lines.push('');
  }

  // Debts
  if (context.debts.length > 0) {
    lines.push('=== DIVIDAS ===');
    lines.push(
      `Resumo: ${context.debtsSummary.totalDebts} dividas, ` +
      `${formatCurrency(context.debtsSummary.totalOpenAmount)} em aberto, ` +
      `${formatCurrency(context.debtsSummary.totalNegotiatedAmount)} negociado`
    );
    for (const debt of context.debts) {
      lines.push(
        `- ${debt.creditorName} (${debt.debtType}): ${formatCurrency(debt.updatedAmount)} - ${debt.status}`
      );
    }
    lines.push('');
  }

  // Monthly Trend
  if (context.monthlyTrend.length > 0) {
    lines.push('=== TENDENCIA MENSAL (ultimos 6 meses) ===');
    for (const point of context.monthlyTrend) {
      lines.push(
        `- ${point.month}: Receitas ${formatCurrency(point.income)}, ` +
        `Despesas ${formatCurrency(point.expenses)}, ` +
        `Saldo ${formatCurrency(point.balance)}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
