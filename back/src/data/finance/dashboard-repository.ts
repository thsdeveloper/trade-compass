import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
  BudgetCategory,
  BudgetAllocation,
  BudgetSummary,
  YearSummary,
} from '../../domain/finance-types.js';

const BUDGET_CATEGORY_CONFIG: Record<BudgetCategory, { label: string; ideal: number }> = {
  ESSENCIAL: { label: 'Essenciais', ideal: 50 },
  ESTILO_VIDA: { label: 'Estilo de Vida', ideal: 30 },
  INVESTIMENTO: { label: 'Investimentos', ideal: 20 },
};

export async function getFinanceSummary(
  userId: string,
  month: string, // YYYY-MM
  accessToken: string
): Promise<FinanceSummary> {
  const client = createUserClient(accessToken);

  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
    .toISOString()
    .split('T')[0];

  // Buscar saldo total das contas (separando beneficios e investimentos)
  const { data: accounts } = await client
    .from('finance_accounts')
    .select('id, current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true);

  let totalBalance = 0;
  let benefitBalance = 0;
  const excludedAccountIds: string[] = [];

  for (const acc of accounts || []) {
    const balance = Number(acc.current_balance);
    if (acc.type === 'BENEFICIO' || acc.type === 'INVESTIMENTO') {
      if (acc.type === 'BENEFICIO') {
        benefitBalance += balance;
      }
      excludedAccountIds.push(acc.id);
    } else {
      totalBalance += balance;
    }
  }

  // Buscar transacoes pendentes do mes (despesas) - excluir transferencias e contas excluidas
  let pendingExpensesQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .eq('status', 'PENDENTE')
    .is('transfer_id', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    pendingExpensesQuery = pendingExpensesQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: pendingExpenses } = await pendingExpensesQuery;

  const totalPendingExpenses =
    pendingExpenses?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes pendentes do mes (receitas) - excluir transferencias e contas excluidas
  let pendingIncomeQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .eq('status', 'PENDENTE')
    .is('transfer_id', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    pendingIncomeQuery = pendingIncomeQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: pendingIncome } = await pendingIncomeQuery;

  const totalPendingIncome = pendingIncome?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes do mes (despesas) - por due_date, excluir transferencias, canceladas e contas excluidas
  let monthExpensesQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .in('status', ['PAGO', 'PENDENTE', 'VENCIDO'])
    .is('transfer_id', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    monthExpensesQuery = monthExpensesQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: monthExpenses } = await monthExpensesQuery;

  const monthExpensesTotal = monthExpenses?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes do mes (receitas) - por due_date, excluir transferencias, canceladas e contas excluidas
  let monthIncomeQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .in('status', ['PAGO', 'PENDENTE', 'VENCIDO'])
    .is('transfer_id', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    monthIncomeQuery = monthIncomeQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: monthIncome } = await monthIncomeQuery;

  const monthIncomeTotal = monthIncome?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

  return {
    total_balance: totalBalance,
    benefit_balance: benefitBalance,
    total_pending_expenses: totalPendingExpenses,
    total_pending_income: totalPendingIncome,
    month_result: monthIncomeTotal - monthExpensesTotal,
    month_expenses: monthExpensesTotal,
    month_income: monthIncomeTotal,
  };
}

export async function getExpensesByCategory(
  userId: string,
  month: string, // YYYY-MM
  accessToken: string
): Promise<ExpensesByCategory[]> {
  const client = createUserClient(accessToken);

  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
    .toISOString()
    .split('T')[0];

  // Buscar contas de INVESTIMENTO e BENEFICIO para excluir suas transacoes
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['INVESTIMENTO', 'BENEFICIO']);

  const excludedAccountIds = excludedAccounts?.map((a: { id: string }) => a.id) || [];

  // Buscar transacoes de despesa do mes com categoria - excluir transferencias e contas excluidas
  let query = client
    .from('finance_transactions')
    .select(`
      amount,
      category:finance_categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
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

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Agrupar por categoria
  const categoryTotals: Record<
    string,
    { name: string; color: string; icon: string; total: number }
  > = {};

  let grandTotal = 0;

  for (const t of transactions) {
    const catData = t.category as { id: string; name: string; color: string; icon: string } | { id: string; name: string; color: string; icon: string }[] | null;
    const cat = Array.isArray(catData) ? catData[0] : catData;
    if (!cat) continue;

    const amount = Number(t.amount);
    grandTotal += amount;

    if (!categoryTotals[cat.id]) {
      categoryTotals[cat.id] = {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        total: 0,
      };
    }
    categoryTotals[cat.id].total += amount;
  }

  // Converter para array com porcentagem
  return Object.entries(categoryTotals)
    .map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      category_color: data.color,
      category_icon: data.icon,
      total: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function getCashFlow(
  userId: string,
  months: number,
  accessToken: string
): Promise<CashFlowPoint[]> {
  const client = createUserClient(accessToken);

  // Buscar contas de INVESTIMENTO e BENEFICIO para excluir suas transacoes
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['INVESTIMENTO', 'BENEFICIO']);

  const excludedAccountIds = excludedAccounts?.map((a: { id: string }) => a.id) || [];

  const result: CashFlowPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const startDate = `${month}-01`;
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    // Receitas do mes - excluir transferencias e contas excluidas
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

    const { data: income } = await incomeQuery;

    const incomeTotal = income?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

    // Despesas do mes - excluir transferencias e contas excluidas
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

    const { data: expenses } = await expenseQuery;

    const expensesTotal = expenses?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

    result.push({
      month,
      income: incomeTotal,
      expenses: expensesTotal,
      balance: incomeTotal - expensesTotal,
    });
  }

  return result;
}

export async function getUpcomingPayments(
  userId: string,
  days: number,
  accessToken: string
): Promise<UpcomingPayment[]> {
  const client = createUserClient(accessToken);

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const { data: transactions } = await client
    .from('finance_transactions')
    .select(`
      id,
      description,
      amount,
      due_date,
      category:finance_categories(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'PENDENTE')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(10);

  if (!transactions) return [];

  const todayTime = today.getTime();

  return transactions.map((t: { id: string; description: string; amount: unknown; due_date: string; category: unknown; credit_card: unknown }) => {
    const dueDate = new Date(t.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - todayTime) / (1000 * 60 * 60 * 24));
    const catData = t.category;
    const category = Array.isArray(catData) ? catData[0] : catData;
    const cardData = t.credit_card;
    const credit_card = Array.isArray(cardData) ? cardData[0] : cardData;

    return {
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      due_date: t.due_date,
      days_until_due: daysUntilDue,
      category,
      credit_card: credit_card || undefined,
    };
  });
}

export async function getUpcomingPaymentsByMonth(
  userId: string,
  month: string, // YYYY-MM
  accessToken: string
): Promise<UpcomingPayment[]> {
  const client = createUserClient(accessToken);

  const startDate = `${month}-01`;
  const endDate = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]),
    0
  ).toISOString().split('T')[0];

  const today = new Date();

  const { data: transactions } = await client
    .from('finance_transactions')
    .select(`
      id,
      description,
      amount,
      due_date,
      category:finance_categories(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'PENDENTE')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .limit(10);

  if (!transactions) return [];

  const todayTime = today.getTime();

  return transactions.map((t: { id: string; description: string; amount: unknown; due_date: string; category: unknown; credit_card: unknown }) => {
    const dueDate = new Date(t.due_date);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - todayTime) / (1000 * 60 * 60 * 24)
    );
    const catData = t.category;
    const category = Array.isArray(catData) ? catData[0] : catData;
    const cardData = t.credit_card;
    const credit_card = Array.isArray(cardData) ? cardData[0] : cardData;

    return {
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      due_date: t.due_date,
      days_until_due: daysUntilDue,
      category,
      credit_card: credit_card || undefined,
    };
  });
}

// Funcao auxiliar para calcular em qual fatura uma transacao de cartao pertence
function getInvoiceMonth(dueDate: string, closingDay: number): string {
  const date = new Date(dueDate + 'T12:00:00');
  const day = date.getDate();

  // Se apos fechamento, vai para proxima fatura
  if (day > closingDay) {
    date.setMonth(date.getMonth() + 1);
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function getBudgetAllocation(
  userId: string,
  month: string, // YYYY-MM
  accessToken: string
): Promise<BudgetSummary> {
  const client = createUserClient(accessToken);

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  // Calcular ultimo dia do mes sem usar toISOString para evitar problemas de timezone
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  // Para transacoes de cartao, expandir para incluir mes anterior
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const expandedStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  // Buscar contas de INVESTIMENTO e BENEFICIO para excluir suas transacoes
  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['INVESTIMENTO', 'BENEFICIO']);

  const excludedAccountIds = excludedAccounts?.map((a: { id: string }) => a.id) || [];

  // Buscar receitas do mes - excluir transferencias e contas excluidas
  let incomeQuery = client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .in('status', ['PAGO', 'PENDENTE'])
    .is('transfer_id', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    incomeQuery = incomeQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: incomeTransactions } = await incomeQuery;

  const totalIncome = incomeTransactions?.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0) || 0;

  // Buscar despesas de CONTA (sem cartao) do mes calendario - excluir transferencias e contas excluidas
  let accountExpensesQuery = client
    .from('finance_transactions')
    .select(`
      amount,
      status,
      category:finance_categories(budget_category)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .is('credit_card_id', null)
    .is('transfer_id', null)
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (excludedAccountIds.length > 0) {
    accountExpensesQuery = accountExpensesQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: accountExpenses } = await accountExpensesQuery;

  // Buscar despesas de CARTAO (mes atual + anterior para pegar periodo da fatura)
  // Cartao nao tem account_id entao nao precisa filtrar por contas excluidas, apenas transferencias
  const { data: cardExpenses } = await client
    .from('finance_transactions')
    .select(`
      amount,
      status,
      due_date,
      category:finance_categories(budget_category),
      credit_card:finance_credit_cards(closing_day)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .not('credit_card_id', 'is', null)
    .is('transfer_id', null)
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', expandedStartDate)
    .lte('due_date', endDate);

  // Agrupar por budget_category separando PAGO e PENDENTE
  const budgetTotals: Record<BudgetCategory, { paid: number; pending: number }> = {
    ESSENCIAL: { paid: 0, pending: 0 },
    ESTILO_VIDA: { paid: 0, pending: 0 },
    INVESTIMENTO: { paid: 0, pending: 0 },
  };

  // Processar despesas de conta
  for (const t of accountExpenses || []) {
    const cat = t.category as unknown as { budget_category: BudgetCategory | null } | null;
    const budgetCat = cat?.budget_category;
    if (budgetCat && budgetTotals[budgetCat] !== undefined) {
      const amount = Number(t.amount);
      if (t.status === 'PAGO') {
        budgetTotals[budgetCat].paid += amount;
      } else {
        budgetTotals[budgetCat].pending += amount;
      }
    }
  }

  // Processar despesas de cartao (filtrar por periodo da fatura)
  for (const t of cardExpenses || []) {
    const card = t.credit_card as unknown as { closing_day: number } | null;
    if (!card) continue;

    // Verificar se essa transacao pertence a fatura do mes selecionado
    const invoiceMonth = getInvoiceMonth(t.due_date, card.closing_day);
    if (invoiceMonth !== month) continue;

    const cat = t.category as unknown as { budget_category: BudgetCategory | null } | null;
    const budgetCat = cat?.budget_category;
    if (budgetCat && budgetTotals[budgetCat] !== undefined) {
      const amount = Number(t.amount);
      if (t.status === 'PAGO') {
        budgetTotals[budgetCat].paid += amount;
      } else {
        budgetTotals[budgetCat].pending += amount;
      }
    }
  }

  // Calcular alocacoes
  const allocations: BudgetAllocation[] = (Object.keys(BUDGET_CATEGORY_CONFIG) as BudgetCategory[]).map(
    (category) => {
      const config = BUDGET_CATEGORY_CONFIG[category];
      const paidAmount = budgetTotals[category].paid;
      const pendingAmount = budgetTotals[category].pending;
      const actualAmount = paidAmount + pendingAmount;
      const actualPercentage = totalIncome > 0 ? (actualAmount / totalIncome) * 100 : 0;
      const paidPercentage = totalIncome > 0 ? (paidAmount / totalIncome) * 100 : 0;
      const pendingPercentage = totalIncome > 0 ? (pendingAmount / totalIncome) * 100 : 0;
      const idealAmount = totalIncome * (config.ideal / 100);
      const difference = actualAmount - idealAmount;

      let status: 'on_track' | 'over_budget' | 'under_budget';
      // Tolerancia de 5% para considerar "on_track"
      if (Math.abs(actualPercentage - config.ideal) <= 5) {
        status = 'on_track';
      } else if (actualPercentage > config.ideal) {
        status = 'over_budget';
      } else {
        status = 'under_budget';
      }

      return {
        category,
        label: config.label,
        ideal_percentage: config.ideal,
        actual_amount: actualAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        actual_percentage: actualPercentage,
        paid_percentage: paidPercentage,
        pending_percentage: pendingPercentage,
        status,
        difference,
      };
    }
  );

  return {
    total_income: totalIncome,
    allocations,
    month,
  };
}

export async function getYearSummary(
  userId: string,
  year: number,
  accessToken: string
): Promise<YearSummary> {
  const client = createUserClient(accessToken);

  // Buscar saldo total das contas (separando beneficios e investimentos)
  const { data: accounts } = await client
    .from('finance_accounts')
    .select('id, current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true);

  let totalBalance = 0;
  const excludedAccountIds: string[] = [];

  for (const acc of accounts || []) {
    // Nao incluir saldo de contas BENEFICIO e INVESTIMENTO no total
    if (acc.type === 'BENEFICIO' || acc.type === 'INVESTIMENTO') {
      excludedAccountIds.push(acc.id);
    } else {
      totalBalance += Number(acc.current_balance);
    }
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Buscar todas as transacoes do ano - excluir transferencias e contas excluidas
  let query = client
    .from('finance_transactions')
    .select('type, status, amount, due_date')
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

  // Inicializar dados mensais
  const monthlyData: Record<string, { income: number; expenses: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    monthlyData[monthKey] = { income: 0, expenses: 0 };
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  // Calcular totais e dados mensais
  for (const t of transactions || []) {
    const amount = Number(t.amount);
    const monthKey = t.due_date.substring(0, 7);

    if (t.type === 'RECEITA') {
      totalIncome += amount;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].income += amount;
      }
    } else if (t.type === 'DESPESA') {
      totalExpenses += amount;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += amount;
      }
    }
  }

  const monthlyBreakdown = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      result: data.income - data.expenses,
    }));

  return {
    year,
    total_balance: totalBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    year_result: totalIncome - totalExpenses,
    monthly_breakdown: monthlyBreakdown,
  };
}
