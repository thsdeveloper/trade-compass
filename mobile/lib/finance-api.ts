import { supabase } from './supabase';
import type {
  FinanceCategory,
  FinanceAccount,
  TransactionWithDetails,
  TransactionFormData,
  FinanceTransaction,
} from '@/types/finance';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Nao autenticado');
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    ...options?.headers,
  };

  if (options?.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
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
