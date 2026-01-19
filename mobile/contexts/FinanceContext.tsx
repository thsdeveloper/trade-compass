import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getCategories,
  getAccounts,
  getTransactions,
  createTransaction as apiCreateTransaction,
} from '@/lib/finance-api';
import type {
  FinanceCategory,
  FinanceAccount,
  TransactionWithDetails,
  TransactionFormData,
} from '@/types/finance';

interface FinanceContextType {
  transactions: TransactionWithDetails[];
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  selectedMonth: Date;
  isLoading: boolean;
  error: string | null;
  setSelectedMonth: (date: Date) => void;
  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadTransactions = useCallback(async () => {
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
    }
  }, [selectedMonth, getMonthRange]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data.filter((c) => c.is_active));
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.filter((a) => a.is_active));
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    }
  }, []);

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

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        selectedMonth,
        isLoading,
        error,
        setSelectedMonth,
        loadTransactions,
        loadCategories,
        loadAccounts,
        createTransaction,
        refreshAll,
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
