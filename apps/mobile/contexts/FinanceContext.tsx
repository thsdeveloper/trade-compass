import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCategories,
  getAccounts,
  getTransactions,
  createTransaction as apiCreateTransaction,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getDashboardSummary,
  getExpensesByCategory,
  getUpcomingPayments,
  getBudgetAllocation,
} from '@/lib/finance-api';
import type {
  FinanceCategory,
  FinanceAccount,
  TransactionWithDetails,
  TransactionFormData,
  AccountFormData,
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  BudgetSummary,
} from '@/types/finance';
import type { UpdateAccountPayload } from '@/lib/finance-api';

interface FinanceContextType {
  transactions: TransactionWithDetails[];
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  selectedMonth: Date;
  isLoading: boolean;
  error: string | null;
  /** Flags de "primeira carga concluída" por fonte, para skeletons por seção */
  accountsLoaded: boolean;
  transactionsLoaded: boolean;
  dashboardLoaded: boolean;
  setSelectedMonth: (date: Date) => void;
  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  createAccount: (data: AccountFormData) => Promise<void>;
  updateAccount: (id: string, data: UpdateAccountPayload) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  // Dashboard
  dashboardSummary: FinanceSummary | null;
  expensesByCategory: ExpensesByCategory[];
  upcomingPayments: UpcomingPayment[];
  budgetSummary: BudgetSummary | null;
  isDashboardLoading: boolean;
  dashboardError: string | null;
  loadDashboard: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Nada é buscado sem sessão (a home monta antes do redirect para /auth).
  // isLoggedIn nas deps renova os callbacks no login, refazendo os fetches.
  const { isLoggedIn } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);

  // Dashboard state
  const [dashboardSummary, setDashboardSummary] = useState<FinanceSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const getMonthRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  }, []);

  const getMonthString = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const { start_date, end_date } = getMonthRange(selectedMonth);
      const data = await getTransactions({ start_date, end_date });
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transacoes');
    } finally {
      setIsLoading(false);
      setTransactionsLoaded(true);
    }
  }, [isLoggedIn, selectedMonth, getMonthRange]);

  const loadCategories = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getCategories();
      setCategories(data.filter((c) => c.is_active));
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, [isLoggedIn]);

  const loadAccounts = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getAccounts();
      setAccounts(data.filter((a) => a.is_active));
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setAccountsLoaded(true);
    }
  }, [isLoggedIn]);

  const createTransaction = useCallback(
    async (data: TransactionFormData) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateTransaction(data);
        await loadTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar transacao';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadTransactions]
  );

  const createAccount = useCallback(
    async (data: AccountFormData) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateAccount(data);
        await loadAccounts();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar conta';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadAccounts]
  );

  // As transações carregadas trazem a conta embutida (account), então editar
  // nome/cor exige recarregá-las para não exibir o dado antigo.
  const updateAccount = useCallback(
    async (id: string, data: UpdateAccountPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiUpdateAccount(id, data);
        await Promise.all([loadAccounts(), loadTransactions()]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao editar conta';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadAccounts, loadTransactions]
  );

  // A exclusão é um soft delete e só passa quando não há transações efetuadas,
  // mas as CANCELADO continuam apontando para a conta — recarrega as duas fontes.
  const deleteAccount = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiDeleteAccount(id);
        await Promise.all([loadAccounts(), loadTransactions()]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir conta';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadAccounts, loadTransactions]
  );

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadTransactions(), loadCategories(), loadAccounts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [loadTransactions, loadCategories, loadAccounts]);

  const loadDashboard = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const month = getMonthString(selectedMonth);
      const [summary, expenses, upcoming, budget] = await Promise.all([
        getDashboardSummary(month),
        getExpensesByCategory(month),
        getUpcomingPayments({ month }),
        getBudgetAllocation(month),
      ]);
      setDashboardSummary(summary);
      setExpensesByCategory(expenses);
      setUpcomingPayments(upcoming);
      setBudgetSummary(budget);
      setDashboardLoaded(true);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setIsDashboardLoading(false);
    }
  }, [isLoggedIn, selectedMonth, getMonthString]);

  // Ao sair da conta, zera dados e flags para o próximo login recomeçar com
  // skeletons — e para não vazar dados de um usuário para outro.
  useEffect(() => {
    if (isLoggedIn) return;
    setAccounts([]);
    setTransactions([]);
    setDashboardSummary(null);
    setExpensesByCategory([]);
    setUpcomingPayments([]);
    setBudgetSummary(null);
    setAccountsLoaded(false);
    setTransactionsLoaded(false);
    setDashboardLoaded(false);
  }, [isLoggedIn]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        selectedMonth,
        isLoading,
        error,
        accountsLoaded,
        transactionsLoaded,
        dashboardLoaded,
        setSelectedMonth,
        loadTransactions,
        loadCategories,
        loadAccounts,
        createTransaction,
        createAccount,
        updateAccount,
        deleteAccount,
        refreshAll,
        // Dashboard
        dashboardSummary,
        expensesByCategory,
        upcomingPayments,
        budgetSummary,
        isDashboardLoading,
        dashboardError,
        loadDashboard,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
