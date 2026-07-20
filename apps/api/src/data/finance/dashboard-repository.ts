import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
  BudgetCategory,
  BudgetAllocation,
  BudgetSummary,
  BudgetBreakdown,
  BudgetBreakdownBucket,
  BudgetBreakdownCategory,
  BudgetTransactionItem,
  BudgetTransactionsPage,
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
      category:finance_global_categories(id, name, color, icon)
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
      category:finance_global_categories(*),
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
      category:finance_global_categories(*),
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
      category:finance_global_categories(budget_category, parent:finance_global_categories!parent_id(budget_category))
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
      category:finance_global_categories(budget_category, parent:finance_global_categories!parent_id(budget_category)),
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

  // Bucket 50/30/20: a categoria-mãe sempre prevalece. Transação numa
  // categoria-filha é contabilizada no bucket da mãe.
  const resolveBudgetCat = (
    cat: {
      budget_category: BudgetCategory | null;
      parent?: { budget_category: BudgetCategory | null } | null;
    } | null
  ): BudgetCategory | null => cat?.parent?.budget_category ?? cat?.budget_category ?? null;

  // Processar despesas de conta
  for (const t of accountExpenses || []) {
    const cat = t.category as unknown as {
      budget_category: BudgetCategory | null;
      parent?: { budget_category: BudgetCategory | null } | null;
    } | null;
    const budgetCat = resolveBudgetCat(cat);
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

    const cat = t.category as unknown as {
      budget_category: BudgetCategory | null;
      parent?: { budget_category: BudgetCategory | null } | null;
    } | null;
    const budgetCat = resolveBudgetCat(cat);
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

/**
 * Detalhamento dos gastos por bucket 50-30-20 no mês: para cada bucket,
 * as categorias que o compõem (com valor pago/pendente e contagem) e as
 * transações individuais. Usa exatamente a mesma fonte de dados do
 * budget-allocation (despesas de conta + cartão com lógica de fatura,
 * excluindo transferências e contas de INVESTIMENTO/BENEFICIO).
 */
export async function getBudgetBreakdown(
  userId: string,
  month: string, // YYYY-MM
  accessToken: string
): Promise<BudgetBreakdown> {
  const client = createUserClient(accessToken);

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const expandedStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['INVESTIMENTO', 'BENEFICIO']);

  const excludedAccountIds = excludedAccounts?.map((a: { id: string }) => a.id) || [];

  const categorySelect =
    'category:finance_global_categories(id, name, color, icon, budget_category, parent:finance_global_categories!parent_id(budget_category))';

  // Despesas de CONTA (sem cartão) do mês calendário
  let accountExpensesQuery = client
    .from('finance_transactions')
    .select(`id, description, amount, status, due_date, ${categorySelect}`)
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

  // Despesas de CARTÃO (mês atual + anterior, filtradas pela fatura)
  const { data: cardExpenses } = await client
    .from('finance_transactions')
    .select(
      `id, description, amount, status, due_date, ${categorySelect}, credit_card:finance_credit_cards(closing_day)`
    )
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .not('credit_card_id', 'is', null)
    .is('transfer_id', null)
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', expandedStartDate)
    .lte('due_date', endDate);

  type JoinedCategory = {
    id: string;
    name: string;
    color: string;
    icon: string;
    budget_category: BudgetCategory | null;
    parent?: { budget_category: BudgetCategory | null } | null;
  };

  const resolveBudgetCat = (cat: JoinedCategory | null): BudgetCategory | null =>
    cat?.parent?.budget_category ?? cat?.budget_category ?? null;

  // Acumuladores: bucket -> categoria -> dados
  const buckets: Record<
    BudgetCategory,
    Map<string, BudgetBreakdownCategory>
  > = {
    ESSENCIAL: new Map(),
    ESTILO_VIDA: new Map(),
    INVESTIMENTO: new Map(),
  };

  const addExpense = (
    row: {
      id: string;
      description: string | null;
      amount: unknown;
      status: string;
      due_date: string;
      category: unknown;
    },
    isCreditCard: boolean
  ) => {
    const catData = row.category as JoinedCategory | JoinedCategory[] | null;
    const cat = Array.isArray(catData) ? catData[0] : catData;
    const budgetCat = resolveBudgetCat(cat ?? null);
    if (!cat || !budgetCat || buckets[budgetCat] === undefined) return;

    const amount = Number(row.amount);
    const isPaid = row.status === 'PAGO';
    const map = buckets[budgetCat];
    let entry = map.get(cat.id);
    if (!entry) {
      entry = {
        category_id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        amount: 0,
        paid: 0,
        pending: 0,
        count: 0,
        transactions: [],
      };
      map.set(cat.id, entry);
    }
    entry.amount += amount;
    entry.count += 1;
    if (isPaid) entry.paid += amount;
    else entry.pending += amount;
    entry.transactions.push({
      id: row.id,
      description: row.description ?? 'Sem descrição',
      amount,
      due_date: row.due_date,
      status: isPaid ? 'PAGO' : 'PENDENTE',
      is_credit_card: isCreditCard,
    });
  };

  for (const t of accountExpenses || []) {
    addExpense(t as never, false);
  }

  for (const t of cardExpenses || []) {
    const card = (t as { credit_card: unknown }).credit_card as
      | { closing_day: number }
      | { closing_day: number }[]
      | null;
    const cardObj = Array.isArray(card) ? card[0] : card;
    if (!cardObj) continue;
    // Só conta se a transação pertence à fatura do mês selecionado
    if (getInvoiceMonth((t as { due_date: string }).due_date, cardObj.closing_day) !== month) {
      continue;
    }
    addExpense(t as never, true);
  }

  const bucketOrder: BudgetCategory[] = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];

  const result: BudgetBreakdownBucket[] = bucketOrder.map((category) => {
    const categories = Array.from(buckets[category].values())
      .map((c) => ({
        ...c,
        transactions: c.transactions.sort((a, b) =>
          b.due_date.localeCompare(a.due_date)
        ),
      }))
      .sort((a, b) => b.amount - a.amount);

    const paid = categories.reduce((s, c) => s + c.paid, 0);
    const pending = categories.reduce((s, c) => s + c.pending, 0);

    return {
      category,
      label: BUDGET_CATEGORY_CONFIG[category].label,
      total: paid + pending,
      paid,
      pending,
      categories,
    };
  });

  return { month, buckets: result };
}

/**
 * Lista paginada e pesquisável das transações de despesa de um bucket 50-30-20
 * no mês. Usa exatamente a mesma fonte de dados do budget-allocation/breakdown:
 * despesas de conta no mês calendário + despesas de cartão filtradas pela
 * fatura (janela expandida mês anterior..fim do mês), excluindo transferências
 * e contas de INVESTIMENTO/BENEFICIO, com bucket resolvido pela categoria-mãe.
 */
export async function getBudgetTransactions(
  userId: string,
  month: string, // YYYY-MM
  bucket: BudgetCategory,
  accessToken: string,
  opts: { search?: string; status?: 'PAGO' | 'PENDENTE'; limit: number; offset: number }
): Promise<BudgetTransactionsPage> {
  const client = createUserClient(accessToken);

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const expandedStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  const { data: excludedAccounts } = await client
    .from('finance_accounts')
    .select('id')
    .eq('user_id', userId)
    .in('type', ['INVESTIMENTO', 'BENEFICIO']);

  const excludedAccountIds = excludedAccounts?.map((a: { id: string }) => a.id) || [];

  const categorySelect =
    'category:finance_global_categories(id, name, color, icon, budget_category, parent:finance_global_categories!parent_id(budget_category))';

  // Escapar curingas do LIKE (%, _ e \) na busca do usuário
  const searchPattern = opts.search
    ? `%${opts.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    : null;

  const statusFilter: string[] = opts.status ? [opts.status] : ['PAGO', 'PENDENTE'];

  // Despesas de CONTA (sem cartão) do mês calendário
  let accountExpensesQuery = client
    .from('finance_transactions')
    .select(
      `id, description, amount, status, due_date, ${categorySelect}, account:finance_accounts(name)`
    )
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .is('credit_card_id', null)
    .is('transfer_id', null)
    .in('status', statusFilter)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (searchPattern) {
    accountExpensesQuery = accountExpensesQuery.ilike('description', searchPattern);
  }

  if (excludedAccountIds.length > 0) {
    accountExpensesQuery = accountExpensesQuery.or(
      `account_id.is.null,account_id.not.in.(${excludedAccountIds.join(',')})`
    );
  }

  const { data: accountExpenses } = await accountExpensesQuery;

  // Despesas de CARTÃO (mês atual + anterior, filtradas pela fatura em memória)
  let cardExpensesQuery = client
    .from('finance_transactions')
    .select(
      `id, description, amount, status, due_date, ${categorySelect}, credit_card:finance_credit_cards(name, closing_day)`
    )
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .not('credit_card_id', 'is', null)
    .is('transfer_id', null)
    .in('status', statusFilter)
    .gte('due_date', expandedStartDate)
    .lte('due_date', endDate);

  if (searchPattern) {
    cardExpensesQuery = cardExpensesQuery.ilike('description', searchPattern);
  }

  const { data: cardExpenses } = await cardExpensesQuery;

  type JoinedCategory = {
    id: string;
    name: string;
    color: string;
    icon: string;
    budget_category: BudgetCategory | null;
    parent?: { budget_category: BudgetCategory | null } | null;
  };

  const resolveBudgetCat = (cat: JoinedCategory | null): BudgetCategory | null =>
    cat?.parent?.budget_category ?? cat?.budget_category ?? null;

  const items: BudgetTransactionItem[] = [];

  const pushItem = (
    row: {
      id: string;
      description: string | null;
      amount: unknown;
      status: string;
      due_date: string;
      category: unknown;
    },
    isCreditCard: boolean,
    sourceName: string | null
  ) => {
    const catData = row.category as JoinedCategory | JoinedCategory[] | null;
    const cat = Array.isArray(catData) ? catData[0] : catData;
    if (!cat || resolveBudgetCat(cat) !== bucket) return;

    items.push({
      id: row.id,
      description: row.description ?? 'Sem descrição',
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status === 'PAGO' ? 'PAGO' : 'PENDENTE',
      is_credit_card: isCreditCard,
      source_name: sourceName,
      category_id: cat.id,
      category_name: cat.name,
      category_color: cat.color,
      category_icon: cat.icon,
    });
  };

  for (const t of accountExpenses || []) {
    const accData = (t as { account: unknown }).account as
      | { name: string }
      | { name: string }[]
      | null;
    const acc = Array.isArray(accData) ? accData[0] : accData;
    pushItem(t as never, false, acc?.name ?? null);
  }

  for (const t of cardExpenses || []) {
    const cardData = (t as { credit_card: unknown }).credit_card as
      | { name: string; closing_day: number }
      | { name: string; closing_day: number }[]
      | null;
    const card = Array.isArray(cardData) ? cardData[0] : cardData;
    if (!card) continue;
    // Só conta se a transação pertence à fatura do mês selecionado
    if (getInvoiceMonth((t as { due_date: string }).due_date, card.closing_day) !== month) {
      continue;
    }
    pushItem(t as never, true, card.name ?? null);
  }

  // Ordenar por vencimento desc (desempate por id para paginação estável)
  items.sort((a, b) => b.due_date.localeCompare(a.due_date) || a.id.localeCompare(b.id));

  const totalCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const pageItems = items.slice(opts.offset, opts.offset + opts.limit);

  return {
    bucket,
    month,
    total_count: totalCount,
    total_amount: totalAmount,
    has_more: opts.offset + opts.limit < totalCount,
    items: pageItems,
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
