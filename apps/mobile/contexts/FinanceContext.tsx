import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  getCreditCards,
  createCreditCard as apiCreateCreditCard,
  updateCreditCard as apiUpdateCreditCard,
  deleteCreditCard as apiDeleteCreditCard,
  getDashboardSummary,
  getExpensesByCategory,
  getUpcomingPayments,
  getBudgetAllocation,
  getTags,
  createTag as apiCreateTag,
  createTransfer as apiCreateTransfer,
  createRecurrence as apiCreateRecurrence,
  generateDueRecurrences,
} from '@/lib/finance-api';
import type {
  FinanceCategory,
  FinanceAccount,
  TransactionWithDetails,
  TransactionFormData,
  AccountFormData,
  FinanceCreditCard,
  CreditCardFormData,
  FinanceSummary,
  ExpensesByCategory,
  UpcomingPayment,
  BudgetSummary,
  FinanceTag,
  CreateTransferInput,
  CreateRecurrenceInput,
} from '@/types/finance';
import type { UpdateAccountPayload } from '@/lib/finance-api';

interface FinanceContextType {
  transactions: TransactionWithDetails[];
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  creditCards: FinanceCreditCard[];
  tags: FinanceTag[];
  isLoading: boolean;
  error: string | null;
  /**
   * Incrementado a cada mutação de transação (criar/transferir/recorrência).
   * Fontes independentes do contexto (ex.: feed paginado da aba Transações)
   * observam este contador para se atualizarem sem pull-to-refresh.
   */
  dataVersion: number;
  /** Flags de "primeira carga concluída" por fonte, para skeletons por seção */
  accountsLoaded: boolean;
  transactionsLoaded: boolean;
  dashboardLoaded: boolean;
  creditCardsLoaded: boolean;
  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  loadCreditCards: () => Promise<void>;
  loadTags: () => Promise<void>;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  createTransfer: (data: CreateTransferInput) => Promise<void>;
  createRecurrence: (data: CreateRecurrenceInput) => Promise<void>;
  createTag: (name: string) => Promise<FinanceTag>;
  createAccount: (data: AccountFormData) => Promise<void>;
  updateAccount: (id: string, data: UpdateAccountPayload) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  createCreditCard: (data: CreditCardFormData) => Promise<void>;
  updateCreditCard: (id: string, data: Partial<CreditCardFormData>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [tags, setTags] = useState<FinanceTag[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [creditCardsLoaded, setCreditCardsLoaded] = useState(false);

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

  // Transações e dashboard do contexto são SEMPRE do mês corrente: é o que a
  // home exibe. Telas com navegação de mês (orçamento, despesas por categoria)
  // têm estado de mês próprio e buscam seus dados direto na API — navegar lá
  // não pode refletir aqui.
  const loadTransactions = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const { start_date, end_date } = getMonthRange(new Date());
      const data = await getTransactions({ start_date, end_date });
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transacoes');
    } finally {
      setIsLoading(false);
      setTransactionsLoaded(true);
    }
  }, [isLoggedIn, getMonthRange]);

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

  const loadCreditCards = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getCreditCards();
      setCreditCards(data.filter((card) => card.is_active));
    } catch (err) {
      console.error('Erro ao carregar cartoes:', err);
    } finally {
      setCreditCardsLoaded(true);
    }
  }, [isLoggedIn]);

  const loadTags = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
    }
  }, [isLoggedIn]);

  const createTag = useCallback(async (name: string) => {
    const tag = await apiCreateTag(name.trim());
    setTags((prev) =>
      [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );
    return tag;
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const month = getMonthString(new Date());
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
  }, [isLoggedIn, getMonthString]);

  /**
   * Invalidação pós-mutação: toda criação de transação/transferência/
   * recorrência recarrega o mês e o dashboard da home imediatamente, e o
   * dataVersion avisa fontes independentes (feed paginado da aba Transações).
   * `extras` cobre fontes atingidas só por algumas mutações (contas, cartões).
   */
  const invalidateAfterMutation = useCallback(
    async (...extras: Promise<void>[]) => {
      await Promise.all([loadTransactions(), loadDashboard(), ...extras]);
      setDataVersion((v) => v + 1);
    },
    [loadTransactions, loadDashboard]
  );

  const createTransaction = useCallback(
    async (data: TransactionFormData) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateTransaction(data);
        // Cartao mexe no limite disponivel; transacao ja PAGA mexe no saldo
        const extras: Promise<void>[] = [];
        if (data.credit_card_id) extras.push(loadCreditCards());
        if (data.status === 'PAGO' && data.account_id) extras.push(loadAccounts());
        await invalidateAfterMutation(...extras);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar transacao';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [invalidateAfterMutation, loadCreditCards, loadAccounts]
  );

  // Transferência move saldo das duas contas na hora — recarrega contas junto
  const createTransfer = useCallback(
    async (data: CreateTransferInput) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateTransfer(data);
        await invalidateAfterMutation(loadAccounts());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar transferencia';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [invalidateAfterMutation, loadAccounts]
  );

  // O POST de recorrência já cria a primeira ocorrência; transferência
  // recorrente com início hoje/passado também move saldos
  const createRecurrence = useCallback(
    async (data: CreateRecurrenceInput) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateRecurrence(data);
        const extras: Promise<void>[] = [];
        if (data.type === 'TRANSFERENCIA') extras.push(loadAccounts());
        if (data.credit_card_id) extras.push(loadCreditCards());
        await invalidateAfterMutation(...extras);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar recorrencia';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [invalidateAfterMutation, loadAccounts, loadCreditCards]
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

  const createCreditCard = useCallback(
    async (data: CreditCardFormData) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiCreateCreditCard(data);
        await loadCreditCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar cartao';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadCreditCards]
  );

  const updateCreditCard = useCallback(
    async (id: string, data: Partial<CreditCardFormData>) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiUpdateCreditCard(id, data);
        await loadCreditCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao editar cartao';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadCreditCards]
  );

  const deleteCreditCard = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiDeleteCreditCard(id);
        await loadCreditCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir cartao';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadCreditCards]
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

  // Materialização de recorrências vencidas: não há cron no backend, então o
  // app dispara uma vez por sessão logo após o login. Fire-and-forget — falha
  // aqui não pode travar o bootstrap; a próxima sessão tenta de novo.
  const generateDueRanRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || generateDueRanRef.current) return;
    generateDueRanRef.current = true;
    (async () => {
      try {
        const { generated } = await generateDueRecurrences();
        if (generated > 0) {
          await invalidateAfterMutation(loadAccounts());
        }
      } catch (err) {
        console.error('Erro ao gerar recorrencias vencidas:', err);
      }
    })();
  }, [isLoggedIn, invalidateAfterMutation, loadAccounts]);

  // Ao sair da conta, zera dados e flags para o próximo login recomeçar com
  // skeletons — e para não vazar dados de um usuário para outro.
  useEffect(() => {
    if (isLoggedIn) return;
    generateDueRanRef.current = false;
    setTags([]);
    setAccounts([]);
    setCreditCards([]);
    setTransactions([]);
    setDashboardSummary(null);
    setExpensesByCategory([]);
    setUpcomingPayments([]);
    setBudgetSummary(null);
    setAccountsLoaded(false);
    setTransactionsLoaded(false);
    setDashboardLoaded(false);
    setCreditCardsLoaded(false);
  }, [isLoggedIn]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        creditCards,
        tags,
        isLoading,
        error,
        dataVersion,
        accountsLoaded,
        transactionsLoaded,
        dashboardLoaded,
        creditCardsLoaded,
        loadTransactions,
        loadCategories,
        loadAccounts,
        loadCreditCards,
        loadTags,
        createTransaction,
        createTransfer,
        createRecurrence,
        createTag,
        createAccount,
        updateAccount,
        deleteAccount,
        createCreditCard,
        updateCreditCard,
        deleteCreditCard,
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
