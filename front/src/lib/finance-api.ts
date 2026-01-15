import type {
  FinanceCategory,
  FinanceAccount,
  FinanceCreditCard,
  FinanceTransaction,
  FinanceRecurrence,
  TransactionWithDetails,
  CreditCardInvoice,
  FinanceSummary,
  ExpensesByCategory,
  CashFlowPoint,
  UpcomingPayment,
  CategoryFormData,
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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    return response.json();
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

  // Accounts
  async getAccounts(accessToken: string): Promise<FinanceAccount[]> {
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
    data: { paid_amount?: number; payment_date?: string },
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

  // Recurrences
  async getRecurrences(accessToken: string): Promise<FinanceRecurrence[]> {
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
    days: number = 30
  ): Promise<UpcomingPayment[]> {
    return this.authFetch(
      `/finance/dashboard/upcoming?days=${days}`,
      accessToken
    );
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
}

export const financeApi = new FinanceApiClient(API_BASE_URL);
