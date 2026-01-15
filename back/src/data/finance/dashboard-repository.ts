import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
} from '../../domain/finance-types.js';

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

  // Buscar saldo total das contas
  const { data: accounts } = await client
    .from('finance_accounts')
    .select('current_balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

  // Buscar transacoes pendentes (despesas)
  const { data: pendingExpenses } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .eq('status', 'PENDENTE');

  const totalPendingExpenses =
    pendingExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes pendentes (receitas)
  const { data: pendingIncome } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .eq('status', 'PENDENTE');

  const totalPendingIncome = pendingIncome?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes do mes (despesas pagas)
  const { data: monthExpenses } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .eq('status', 'PAGO')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);

  const monthExpensesTotal = monthExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Buscar transacoes do mes (receitas pagas)
  const { data: monthIncome } = await client
    .from('finance_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'RECEITA')
    .eq('status', 'PAGO')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);

  const monthIncomeTotal = monthIncome?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return {
    total_balance: totalBalance,
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

  // Buscar transacoes de despesa do mes com categoria
  const { data: transactions } = await client
    .from('finance_transactions')
    .select(`
      amount,
      category:finance_categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .eq('type', 'DESPESA')
    .in('status', ['PAGO', 'PENDENTE'])
    .gte('due_date', startDate)
    .lte('due_date', endDate);

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
    const cat = t.category as { id: string; name: string; color: string; icon: string };
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

  const result: CashFlowPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const startDate = `${month}-01`;
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    // Receitas do mes
    const { data: income } = await client
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'RECEITA')
      .in('status', ['PAGO', 'PENDENTE'])
      .gte('due_date', startDate)
      .lte('due_date', endDate);

    const incomeTotal = income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Despesas do mes
    const { data: expenses } = await client
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'DESPESA')
      .in('status', ['PAGO', 'PENDENTE'])
      .gte('due_date', startDate)
      .lte('due_date', endDate);

    const expensesTotal = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

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

  return transactions.map((t) => {
    const dueDate = new Date(t.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - todayTime) / (1000 * 60 * 60 * 24));

    return {
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      due_date: t.due_date,
      days_until_due: daysUntilDue,
      category: t.category,
      credit_card: t.credit_card || undefined,
    };
  });
}
