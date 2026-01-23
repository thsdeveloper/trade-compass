import { supabase } from './supabase';
import type {
  FinanceCategory,
  FinanceAccount,
  TransactionWithDetails,
  TransactionFormData,
  FinanceTransaction,
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  BudgetSummary,
} from '@/types/finance';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

async function getAccessToken(): Promise<string | null> {
  console.log('[finance-api] Buscando sessão...');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  console.log('[finance-api] Sessão encontrada:', !!session);
  return session?.access_token ?? null;
}

async function authFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  console.log('[finance-api] authFetch iniciado para:', endpoint);
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Nao autenticado');
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    'bypass-tunnel-reminder': 'true',
    ...options?.headers,
  };

  if (options?.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  console.log('[finance-api] Fazendo fetch para:', `${API_URL}${endpoint}`);
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  console.log('[finance-api] Resposta recebida:', response.status);

  if (!response.ok) {
    let message = `Erro do servidor: ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        const error: ApiError = JSON.parse(text);
        message = error.message || message;
      }
    } catch {
      // Resposta não é JSON válido, usar mensagem padrão
    }
    throw new Error(message);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Categories
export async function getCategories(): Promise<FinanceCategory[]> {
  return authFetch('/finance/categories');
}

// Accounts
export async function getAccounts(): Promise<FinanceAccount[]> {
  return authFetch('/finance/accounts');
}

// Transactions
export async function getTransactions(filters?: {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  type?: string;
  status?: string;
  limit?: number;
}): Promise<TransactionWithDetails[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }
  const query = params.toString();
  return authFetch(`/finance/transactions${query ? `?${query}` : ''}`);
}

export async function createTransaction(
  data: TransactionFormData
): Promise<FinanceTransaction> {
  return authFetch('/finance/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Dashboard
export async function getDashboardSummary(month?: string): Promise<FinanceSummary> {
  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }
  const query = params.toString();
  return authFetch(`/finance/dashboard/summary${query ? `?${query}` : ''}`);
}

export async function getExpensesByCategory(month?: string): Promise<ExpensesByCategory[]> {
  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }
  const query = params.toString();
  return authFetch(`/finance/dashboard/by-category${query ? `?${query}` : ''}`);
}

export async function getUpcomingPayments(params?: {
  days?: number;
  month?: string;
}): Promise<UpcomingPayment[]> {
  const queryParams = new URLSearchParams();
  if (params?.days) {
    queryParams.append('days', String(params.days));
  }
  if (params?.month) {
    queryParams.append('month', params.month);
  }
  const query = queryParams.toString();
  return authFetch(`/finance/dashboard/upcoming${query ? `?${query}` : ''}`);
}

export async function getBudgetAllocation(month?: string): Promise<BudgetSummary> {
  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }
  const query = params.toString();
  return authFetch(`/finance/dashboard/budget-allocation${query ? `?${query}` : ''}`);
}
