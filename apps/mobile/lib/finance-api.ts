import { supabase } from './supabase';
import type {
  FinanceCategory,
  FinanceAccount,
  AccountFormData,
  AccountUsage,
  Bank,
  TransactionWithDetails,
  TransactionFormData,
  FinanceTransaction,
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  BudgetSummary,
  BudgetBreakdown,
  BudgetCategory,
  BudgetTransactionsPage,
  GlobalCategoryWithChildren,
  FinanceCreditCard,
  CreditCardFormData,
  CreditCardInvoiceSummary,
  CreditCardExtractionResult,
  FinanceTag,
  FinanceRecurrence,
  CreateRecurrenceInput,
  CreateTransferInput,
} from '@/types/finance';

import type {
  ConfirmImportItem,
  ConfirmImportResult,
  DetectStatementResponse,
  InvoiceAdjustment,
  ImportTarget,
  ParseStatementResponse,
  PickedStatementFile,
} from '@/types/import';

import { API_URL } from './api-config';

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
    'bypass-tunnel-reminder': 'true',
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

export async function createAccount(
  data: AccountFormData
): Promise<FinanceAccount> {
  return authFetch('/finance/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// bank_id aceita null para desvincular o banco ao trocar o tipo da conta
// (o backend repassa o null direto ao banco).
// `type` fica de fora: o tipo da conta nao muda depois de criada. `is_active`
// tambem: desativar e exclusao, e so o DELETE aplica a regra de vinculos.
export interface UpdateAccountPayload
  extends Omit<Partial<AccountFormData>, 'bank_id' | 'type'> {
  bank_id?: string | null;
}

export async function updateAccount(
  id: string,
  data: UpdateAccountPayload
): Promise<FinanceAccount> {
  return authFetch(`/finance/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  return authFetch(`/finance/accounts/${id}`, {
    method: 'DELETE',
  });
}

// Quantas entidades dependem da conta — a tela usa para explicar por que a
// exclusão está bloqueada
export async function getAccountUsage(id: string): Promise<AccountUsage> {
  return authFetch(`/finance/accounts/${id}/usage`);
}

// Banks (catálogo público, somente leitura — fonte da verdade do bank_id)
export async function getBanks(query?: string): Promise<Bank[]> {
  const params = new URLSearchParams();
  if (query) {
    params.append('q', query);
  }
  const search = params.toString();
  return authFetch(`/finance/banks${search ? `?${search}` : ''}`);
}

export async function getPopularBanks(): Promise<Bank[]> {
  return authFetch('/finance/banks/popular');
}

export async function getBenefitProviders(): Promise<Bank[]> {
  return authFetch('/finance/banks/benefit-providers');
}

// Credit cards
export async function getCreditCards(): Promise<FinanceCreditCard[]> {
  return authFetch('/finance/credit-cards');
}

export async function createCreditCard(
  data: CreditCardFormData
): Promise<FinanceCreditCard> {
  return authFetch('/finance/credit-cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCreditCard(
  id: string,
  data: Partial<CreditCardFormData>
): Promise<FinanceCreditCard> {
  return authFetch(`/finance/credit-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Soft delete: o cartão sai da lista, mas o histórico já lançado permanece
export async function deleteCreditCard(id: string): Promise<void> {
  return authFetch(`/finance/credit-cards/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Extrai os dados do cartão de uma fatura (PDF/imagem) com IA. Não cria o
 * cartão: quem decide entre cadastro direto e formulário é a tela.
 */
export async function extractCreditCardFromInvoice(
  file: PickedStatementFile
): Promise<CreditCardExtractionResult> {
  return authFetch('/finance/credit-cards/extract-invoice', {
    method: 'POST',
    body: JSON.stringify({
      kind: file.kind,
      filename: file.name,
      content: file.content,
      mime_type: file.mimeType,
    }),
  });
}

/** Resumo da fatura do mês (YYYY-MM) de um cartão. */
export async function getCreditCardInvoice(
  id: string,
  month: string
): Promise<CreditCardInvoiceSummary> {
  return authFetch(`/finance/credit-cards/${id}/invoice?month=${month}`);
}

// Tags (sempre do usuário; unicidade de nome tratada pelo backend)
export async function getTags(): Promise<FinanceTag[]> {
  return authFetch('/finance/tags');
}

export async function createTag(name: string): Promise<FinanceTag> {
  return authFetch('/finance/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateTag(id: string, name: string): Promise<FinanceTag> {
  return authFetch(`/finance/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

// Soft delete: a tag some da lista, mas os vínculos antigos permanecem
export async function deleteTag(id: string): Promise<void> {
  return authFetch(`/finance/tags/${id}`, {
    method: 'DELETE',
  });
}

// Transferência entre contas: cria as duas pernas PAGAS e move os saldos
export async function createTransfer(
  data: CreateTransferInput
): Promise<{ transfer_id: string }> {
  return authFetch('/finance/transactions/transfer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Recorrências
export async function getRecurrences(): Promise<FinanceRecurrence[]> {
  return authFetch('/finance/recurrences');
}

export async function createRecurrence(
  data: CreateRecurrenceInput
): Promise<FinanceRecurrence> {
  return authFetch('/finance/recurrences', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Materializa todas as ocorrências vencidas das recorrências ativas do usuário
 * (não há cron no backend — o app dispara no bootstrap da sessão).
 */
export async function generateDueRecurrences(): Promise<{ generated: number }> {
  return authFetch('/finance/recurrences/generate-due', {
    method: 'POST',
  });
}

// Transactions
export async function getTransactions(filters?: {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  /** 'card' = só compras de cartão; 'account' = só lançamentos em conta */
  source?: 'account' | 'card';
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
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

// account_id/credit_card_id aceitam null para desvincular ao trocar entre
// conta e cartão (o backend repassa o null direto ao banco)
export interface UpdateTransactionPayload
  extends Omit<Partial<TransactionFormData>, 'account_id' | 'credit_card_id'> {
  account_id?: string | null;
  credit_card_id?: string | null;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionPayload
): Promise<FinanceTransaction> {
  return authFetch(`/finance/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function payTransaction(
  id: string,
  payment?: { paid_amount?: number; payment_date?: string }
): Promise<FinanceTransaction> {
  return authFetch(`/finance/transactions/${id}/pay`, {
    method: 'PATCH',
    body: JSON.stringify(payment ?? {}),
  });
}

export type BulkDeleteSkipReason =
  | 'not_found'
  | 'transfer'
  | 'already_cancelled'
  | 'credit_card_paid';

export interface BulkDeleteTransactionsResult {
  success: boolean;
  deleted: string[];
  skipped: { id: string; reason: BulkDeleteSkipReason }[];
}

export async function bulkDeleteTransactions(
  ids: string[]
): Promise<BulkDeleteTransactionsResult> {
  return authFetch('/finance/transactions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
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

/** Detalhamento dos gastos por bucket (Essenciais/Estilo de Vida/Investimentos). */
export async function getBudgetBreakdown(month?: string): Promise<BudgetBreakdown> {
  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }
  const query = params.toString();
  return authFetch(`/finance/dashboard/budget-breakdown${query ? `?${query}` : ''}`);
}

/** Transações de um bucket de orçamento, paginadas e com busca (sob demanda). */
export async function getBudgetTransactions(params: {
  bucket: BudgetCategory;
  month: string;
  search?: string;
  status?: 'PAGO' | 'PENDENTE';
  limit?: number;
  offset?: number;
}): Promise<BudgetTransactionsPage> {
  const query = new URLSearchParams({ bucket: params.bucket, month: params.month });
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset !== undefined) query.append('offset', String(params.offset));
  return authFetch(`/finance/dashboard/budget-transactions?${query.toString()}`);
}

// Global categories (catálogo compartilhado, somente leitura)
export async function getGlobalCategories(): Promise<GlobalCategoryWithChildren[]> {
  return authFetch('/finance/global-categories');
}

// Importação de extrato bancário (rotas /finance/import/*; ver types/import.ts)
export async function detectStatement(
  file: PickedStatementFile
): Promise<DetectStatementResponse> {
  return authFetch('/finance/import/detect', {
    method: 'POST',
    body: JSON.stringify({
      kind: file.kind,
      filename: file.name,
      content: file.content,
      mime_type: file.mimeType,
    }),
  });
}

export async function parseStatement(
  file: PickedStatementFile,
  target: ImportTarget
): Promise<ParseStatementResponse> {
  return authFetch('/finance/import/parse', {
    method: 'POST',
    body: JSON.stringify({
      kind: file.kind,
      filename: file.name,
      content: file.content,
      mime_type: file.mimeType,
      ...target,
    }),
  });
}

export async function confirmImport(
  target: ImportTarget,
  items: ConfirmImportItem[],
  invoiceAdjustment?: InvoiceAdjustment
): Promise<ConfirmImportResult> {
  return authFetch('/finance/import/confirm', {
    method: 'POST',
    body: JSON.stringify({
      ...target,
      items,
      invoice_adjustment: invoiceAdjustment,
    }),
  });
}

/** Categoria de sistema para transações de ajuste de saldo (RECEITA/DESPESA) */
export async function getAdjustmentCategory(
  type: 'RECEITA' | 'DESPESA'
): Promise<FinanceCategory> {
  return authFetch(`/finance/categories/system/adjustment/${type}`);
}
