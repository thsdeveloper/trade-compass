import type {
  FinanceCategory,
  FinanceTag,
  FinanceAccount,
  AccountWithBank,
  FinanceCreditCard,
  FinanceTransaction,
  FinanceRecurrence,
  RecurrenceWithDetails,
  TransactionWithDetails,
  CreditCardInvoice,
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
  BudgetSummary,
  YearSummary,
  CategoryFormData,
  TagFormData,
  AccountFormData,
  CreditCardFormData,
  TransactionFormData,
  RecurrenceFormData,
  PayInvoiceFormData,
  InvoicePaymentResult,
  InvoicePaymentWithDetails,
  FinanceDebt,
  FinanceDebtNegotiation,
  DebtWithNegotiation,
  DebtFormData,
  NegotiationFormData,
  GenerateTransactionsFormData,
  DebtSummary,
  DebtStatus,
  DebtType,
  BudgetCategory,
  TransferFormData,
  TransferResult,
  Bank,
  FinanceGoal,
  GoalWithProgress,
  GoalFormData,
  GoalSummary,
  GoalSelectItem,
  FinanceGoalStatus,
  FinanceGoalCategory,
  FinanceGoalPriority,
} from '@/types/finance';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

class FinanceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async authFetch<T>(
    endpoint: string,
    accessToken: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    };

    // Only add Content-Type for requests with body
    if (options?.body) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      cache: 'no-store',
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  // Categories
  async getCategories(accessToken: string): Promise<FinanceCategory[]> {
    return this.authFetch('/finance/categories', accessToken);
  }

  async createCategory(
    data: CategoryFormData,
    accessToken: string
  ): Promise<FinanceCategory> {
    return this.authFetch('/finance/categories', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    id: string,
    data: Partial<CategoryFormData>,
    accessToken: string
  ): Promise<FinanceCategory> {
    return this.authFetch(`/finance/categories/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/categories/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Tags
  async getTags(accessToken: string): Promise<FinanceTag[]> {
    return this.authFetch('/finance/tags', accessToken);
  }

  async createTag(data: TagFormData, accessToken: string): Promise<FinanceTag> {
    return this.authFetch('/finance/tags', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/tags/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Accounts
  async getAccounts(accessToken: string): Promise<AccountWithBank[]> {
    return this.authFetch('/finance/accounts', accessToken);
  }

  async createAccount(
    data: AccountFormData,
    accessToken: string
  ): Promise<FinanceAccount> {
    return this.authFetch('/finance/accounts', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(
    id: string,
    data: Partial<AccountFormData>,
    accessToken: string
  ): Promise<FinanceAccount> {
    return this.authFetch(`/finance/accounts/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/accounts/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Credit Cards
  async getCreditCards(accessToken: string): Promise<FinanceCreditCard[]> {
    return this.authFetch('/finance/credit-cards', accessToken);
  }

  async getCreditCardInvoice(
    cardId: string,
    month: string,
    accessToken: string
  ): Promise<CreditCardInvoice> {
    return this.authFetch(
      `/finance/credit-cards/${cardId}/invoice?month=${month}`,
      accessToken
    );
  }

  async createCreditCard(
    data: CreditCardFormData,
    accessToken: string
  ): Promise<FinanceCreditCard> {
    return this.authFetch('/finance/credit-cards', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCreditCard(
    id: string,
    data: Partial<CreditCardFormData>,
    accessToken: string
  ): Promise<FinanceCreditCard> {
    return this.authFetch(`/finance/credit-cards/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCreditCard(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/credit-cards/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  async payInvoice(
    cardId: string,
    data: PayInvoiceFormData,
    accessToken: string
  ): Promise<InvoicePaymentResult> {
    return this.authFetch(`/finance/credit-cards/${cardId}/pay-invoice`, accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvoicePayments(
    cardId: string,
    accessToken: string
  ): Promise<InvoicePaymentWithDetails[]> {
    return this.authFetch(`/finance/credit-cards/${cardId}/payments`, accessToken);
  }

  // Transactions
  async getTransactions(
    accessToken: string,
    filters?: {
      start_date?: string;
      end_date?: string;
      category_id?: string;
      account_id?: string;
      credit_card_id?: string;
      tag_id?: string;
      type?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<TransactionWithDetails[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.authFetch(
      `/finance/transactions${query ? `?${query}` : ''}`,
      accessToken
    );
  }

  async createTransaction(
    data: Omit<TransactionFormData, 'is_installment' | 'total_installments'>,
    accessToken: string
  ): Promise<FinanceTransaction> {
    return this.authFetch('/finance/transactions', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createInstallmentTransaction(
    data: {
      category_id: string;
      account_id?: string;
      credit_card_id?: string;
      type: string;
      description: string;
      total_amount: number;
      total_installments: number;
      first_due_date: string;
      notes?: string;
      tag_ids?: string[];
    },
    accessToken: string
  ): Promise<FinanceTransaction[]> {
    return this.authFetch('/finance/transactions/installments', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(
    id: string,
    data: Partial<TransactionFormData>,
    accessToken: string
  ): Promise<FinanceTransaction> {
    return this.authFetch(`/finance/transactions/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async payTransaction(
    id: string,
    data: { paid_amount?: number; payment_date?: string; account_id?: string },
    accessToken: string
  ): Promise<FinanceTransaction> {
    return this.authFetch(`/finance/transactions/${id}/pay`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async cancelTransaction(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/transactions/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  async cancelInstallmentGroup(
    groupId: string,
    accessToken: string
  ): Promise<void> {
    await this.authFetch(
      `/finance/transactions/installment-group/${groupId}`,
      accessToken,
      {
        method: 'DELETE',
      }
    );
  }

  async cancelRecurrenceTransaction(
    transactionId: string,
    option: 'only_this' | 'this_and_future' | 'all',
    accessToken: string
  ): Promise<void> {
    await this.authFetch(
      `/finance/transactions/${transactionId}/recurrence`,
      accessToken,
      {
        method: 'DELETE',
        body: JSON.stringify({ option }),
      }
    );
  }

  // Transfers
  async createTransfer(
    data: TransferFormData,
    accessToken: string
  ): Promise<TransferResult> {
    return this.authFetch('/finance/transactions/transfer', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelTransfer(transferId: string, accessToken: string): Promise<void> {
    await this.authFetch(
      `/finance/transactions/transfer/${transferId}`,
      accessToken,
      {
        method: 'DELETE',
      }
    );
  }

  // Recurrences
  async getRecurrences(accessToken: string): Promise<RecurrenceWithDetails[]> {
    return this.authFetch('/finance/recurrences', accessToken);
  }

  async createRecurrence(
    data: RecurrenceFormData,
    accessToken: string
  ): Promise<FinanceRecurrence> {
    return this.authFetch('/finance/recurrences', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRecurrence(
    id: string,
    data: Partial<RecurrenceFormData>,
    accessToken: string
  ): Promise<FinanceRecurrence> {
    return this.authFetch(`/finance/recurrences/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRecurrence(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/recurrences/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  async generateRecurrenceOccurrences(
    id: string,
    count: number,
    accessToken: string
  ): Promise<FinanceTransaction[]> {
    return this.authFetch(
      `/finance/recurrences/${id}/generate?count=${count}`,
      accessToken,
      {
        method: 'POST',
      }
    );
  }

  // Dashboard
  async getDashboardSummary(
    accessToken: string,
    month?: string
  ): Promise<FinanceSummary> {
    const query = month ? `?month=${month}` : '';
    return this.authFetch(`/finance/dashboard/summary${query}`, accessToken);
  }

  async getExpensesByCategory(
    accessToken: string,
    month?: string
  ): Promise<ExpensesByCategory[]> {
    const query = month ? `?month=${month}` : '';
    return this.authFetch(`/finance/dashboard/by-category${query}`, accessToken);
  }

  async getCashFlow(
    accessToken: string,
    months: number = 6
  ): Promise<CashFlowPoint[]> {
    return this.authFetch(
      `/finance/dashboard/cash-flow?months=${months}`,
      accessToken
    );
  }

  async getUpcomingPayments(
    accessToken: string,
    params?: { days?: number; month?: string }
  ): Promise<UpcomingPayment[]> {
    const searchParams = new URLSearchParams();
    if (params?.month) {
      searchParams.append('month', params.month);
    } else if (params?.days) {
      searchParams.append('days', String(params.days));
    } else {
      searchParams.append('days', '30');
    }
    const query = searchParams.toString();
    return this.authFetch(
      `/finance/dashboard/upcoming${query ? `?${query}` : ''}`,
      accessToken
    );
  }

  async getYearSummary(
    accessToken: string,
    year?: number
  ): Promise<YearSummary> {
    const query = year ? `?year=${year}` : '';
    return this.authFetch(`/finance/dashboard/year-summary${query}`, accessToken);
  }

  async getBudgetAllocation(
    accessToken: string,
    month?: string
  ): Promise<BudgetSummary> {
    const query = month ? `?month=${month}` : '';
    return this.authFetch(`/finance/dashboard/budget-allocation${query}`, accessToken);
  }

  async updateCategoryBudget(
    id: string,
    budgetCategory: BudgetCategory,
    accessToken: string
  ): Promise<FinanceCategory> {
    return this.authFetch(`/finance/categories/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ budget_category: budgetCategory }),
    });
  }

  // Debts
  async getDebts(
    accessToken: string,
    filters?: {
      status?: DebtStatus;
      debt_type?: DebtType;
      creditor_name?: string;
      limit?: number;
    }
  ): Promise<DebtWithNegotiation[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.authFetch(`/finance/debts${query ? `?${query}` : ''}`, accessToken);
  }

  async getDebt(id: string, accessToken: string): Promise<DebtWithNegotiation> {
    return this.authFetch(`/finance/debts/${id}`, accessToken);
  }

  async createDebt(data: DebtFormData, accessToken: string): Promise<FinanceDebt> {
    return this.authFetch('/finance/debts', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDebt(
    id: string,
    data: Partial<DebtFormData> & { status?: DebtStatus },
    accessToken: string
  ): Promise<FinanceDebt> {
    return this.authFetch(`/finance/debts/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDebt(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/debts/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Debt Negotiations
  async getNegotiations(
    debtId: string,
    accessToken: string
  ): Promise<FinanceDebtNegotiation[]> {
    return this.authFetch(`/finance/debts/${debtId}/negotiations`, accessToken);
  }

  async createNegotiation(
    debtId: string,
    data: NegotiationFormData,
    accessToken: string
  ): Promise<FinanceDebtNegotiation> {
    return this.authFetch(`/finance/debts/${debtId}/negotiations`, accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNegotiation(
    debtId: string,
    negotiationId: string,
    data: Partial<NegotiationFormData>,
    accessToken: string
  ): Promise<FinanceDebtNegotiation> {
    return this.authFetch(
      `/finance/debts/${debtId}/negotiations/${negotiationId}`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async generateTransactionsFromNegotiation(
    debtId: string,
    negotiationId: string,
    data: GenerateTransactionsFormData,
    accessToken: string
  ): Promise<FinanceTransaction[]> {
    return this.authFetch(
      `/finance/debts/${debtId}/negotiations/${negotiationId}/generate-transactions`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getDebtSummary(accessToken: string): Promise<DebtSummary> {
    return this.authFetch('/finance/debts/summary', accessToken);
  }

  // Banks
  async getBanks(accessToken: string, query?: string): Promise<Bank[]> {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.authFetch(`/finance/banks${params}`, accessToken);
  }

  async getPopularBanks(accessToken: string): Promise<Bank[]> {
    return this.authFetch('/finance/banks/popular', accessToken);
  }

  async getBankById(id: string, accessToken: string): Promise<Bank> {
    return this.authFetch(`/finance/banks/${id}`, accessToken);
  }

  // Goals
  async getGoals(
    accessToken: string,
    filters?: {
      status?: FinanceGoalStatus;
      goal_category?: FinanceGoalCategory;
      priority?: FinanceGoalPriority;
      limit?: number;
    }
  ): Promise<GoalWithProgress[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.authFetch(`/finance/goals${query ? `?${query}` : ''}`, accessToken);
  }

  async getGoal(id: string, accessToken: string): Promise<GoalWithProgress> {
    return this.authFetch(`/finance/goals/${id}`, accessToken);
  }

  async getGoalSummary(accessToken: string): Promise<GoalSummary> {
    return this.authFetch('/finance/goals/summary', accessToken);
  }

  async getGoalsForSelect(accessToken: string): Promise<GoalSelectItem[]> {
    return this.authFetch('/finance/goals/select', accessToken);
  }

  async createGoal(data: GoalFormData, accessToken: string): Promise<FinanceGoal> {
    return this.authFetch('/finance/goals', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(
    id: string,
    data: Partial<GoalFormData> & { status?: FinanceGoalStatus },
    accessToken: string
  ): Promise<FinanceGoal> {
    return this.authFetch(`/finance/goals/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/finance/goals/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  async getGoalContributions(
    goalId: string,
    accessToken: string
  ): Promise<{ id: string; description: string; amount: number; due_date: string; status: string }[]> {
    return this.authFetch(`/finance/goals/${goalId}/contributions`, accessToken);
  }
}

export const financeApi = new FinanceApiClient(API_BASE_URL);
