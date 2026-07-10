import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TransactionsClient, type TransactionsInitialData } from './TransactionsClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PageProps {
  searchParams: Promise<{
    month?: string;
    status?: string;
    account_id?: string;
    category_id?: string;
    urgent?: string;
    search?: string;
  }>;
}

async function getInitialData(accessToken: string, month: string): Promise<TransactionsInitialData> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [year, monthNum] = month.split('-').map(Number);
  // Expand to include previous month for card transactions
  const startDate = new Date(year, monthNum - 2, 1).toISOString().split('T')[0];
  const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

  const [transactions, categories, tags, accounts, creditCards, goals, summary] =
    await Promise.all([
      fetch(`${API_BASE_URL}/finance/transactions?start_date=${startDate}&end_date=${endDate}`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/categories`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/tags`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/accounts`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/credit-cards`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/goals/select`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/finance/dashboard/summary?month=${month}`, {
        headers,
        cache: 'no-store',
      }).then(r => r.ok ? r.json() : {
        total_balance: 0,
        benefit_balance: 0,
        total_pending_expenses: 0,
        total_pending_income: 0,
        month_result: 0,
        month_expenses: 0,
        month_income: 0,
      }),
    ]);

  return { transactions, categories, tags, accounts, creditCards, goals, summary };
}

export default async function TransacoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : defaultMonth;

  const initialData = await getInitialData(session.access_token, month);

  return (
    <TransactionsClient
      initialData={initialData}
      initialMonth={month}
      initialFilters={{
        status: params.status || 'all',
        account: params.account_id || 'all',
        category: params.category_id || 'all',
        urgent: params.urgent === 'true',
        search: params.search || '',
      }}
    />
  );
}
