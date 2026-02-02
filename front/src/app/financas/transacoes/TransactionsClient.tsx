'use client';

import { useEffect, useState, useCallback, useMemo, Fragment, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { RowSelectionState } from '@tanstack/react-table';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { TransactionFiltersSheet } from '@/components/organisms/finance/TransactionFiltersSheet';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { YearSelector } from '@/components/molecules/YearSelector';
import { DataTable } from '@/components/molecules/DataTable';
import { SelectionSummaryBar } from '@/components/molecules/SelectionSummaryBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
} from 'lucide-react';
import { TransacoesPageSkeleton } from '@/components/organisms/skeletons/TransacoesPageSkeleton';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { TransactionsSummaryCards } from '@/components/molecules/TransactionsSummaryCards';
import { getTransactionColumns } from './columns';
import {
  groupTransactionsByInvoice,
  getInvoiceDueDate,
  formatMonthLabel,
  getInvoiceStatusStyles,
  getInvoiceStatusLabel,
  type InvoiceGroup,
} from '@/utils/transaction-helpers';
import type {
  TransactionWithDetails,
  FinanceCategory,
  FinanceTag,
  AccountWithBank,
  FinanceCreditCard,
  TransactionFormData,
  TransactionStatus,
  TransactionType,
  CategoryFormData,
  TagFormData,
  RecurrenceFormData,
  TransferFormData,
  PayTransactionData,
  GoalSelectItem,
  FinanceSummary,
  TransactionFilters,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import type { DeleteRecurrenceOption } from '@/components/organisms/finance/DeleteRecurrenceTransactionDialog';
import type { EditRecurrenceOption } from '@/components/organisms/finance/EditRecurrenceTransactionDialog';
import type { EditInstallmentOption } from '@/components/organisms/finance/EditInstallmentTransactionDialog';

// Dynamic imports for dialogs (loaded on demand)
const TransactionDialog = dynamic(
  () => import('@/components/organisms/finance/TransactionDialog').then(m => ({ default: m.TransactionDialog })),
  { ssr: false }
);

const DeleteRecurrenceTransactionDialog = dynamic(
  () => import('@/components/organisms/finance/DeleteRecurrenceTransactionDialog').then(m => ({ default: m.DeleteRecurrenceTransactionDialog })),
  { ssr: false }
);

const EditRecurrenceTransactionDialog = dynamic(
  () => import('@/components/organisms/finance/EditRecurrenceTransactionDialog').then(m => ({ default: m.EditRecurrenceTransactionDialog })),
  { ssr: false }
);

const EditInstallmentTransactionDialog = dynamic(
  () => import('@/components/organisms/finance/EditInstallmentTransactionDialog').then(m => ({ default: m.EditInstallmentTransactionDialog })),
  { ssr: false }
);

const PayTransactionDialog = dynamic(
  () => import('@/components/organisms/finance/PayTransactionDialog').then(m => ({ default: m.PayTransactionDialog })),
  { ssr: false }
);

const ExportTransactionsDialog = dynamic(
  () => import('@/components/organisms/finance/ExportTransactionsDialog').then(m => ({ default: m.ExportTransactionsDialog })),
  { ssr: false }
);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface TransactionsInitialData {
  transactions: TransactionWithDetails[];
  categories: FinanceCategory[];
  tags: FinanceTag[];
  accounts: AccountWithBank[];
  creditCards: FinanceCreditCard[];
  goals: GoalSelectItem[];
  summary: FinanceSummary;
}

export interface TransactionsClientProps {
  initialData: TransactionsInitialData;
  initialMonth: string;
  initialFilters: {
    status: string;
    account: string;
    category: string;
    urgent: boolean;
    search: string;
  };
}

export function TransactionsClient({
  initialData,
  initialMonth,
  initialFilters,
}: TransactionsClientProps) {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states (initialized from server)
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(initialData.transactions);
  const [categories, setCategories] = useState<FinanceCategory[]>(initialData.categories);
  const [tags, setTags] = useState<FinanceTag[]>(initialData.tags);
  const [accounts, setAccounts] = useState<AccountWithBank[]>(initialData.accounts);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>(initialData.creditCards);
  const [goals, setGoals] = useState<GoalSelectItem[]>(initialData.goals);
  const [summary, setSummary] = useState<FinanceSummary | null>(initialData.summary);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  // Delete recurrence dialog state
  const [deleteRecurrenceDialogOpen, setDeleteRecurrenceDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithDetails | null>(null);

  // Edit recurrence dialog state
  const [editRecurrenceDialogOpen, setEditRecurrenceDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithDetails | null>(null);
  const [editRecurrenceOption, setEditRecurrenceOption] = useState<EditRecurrenceOption | null>(null);

  // Edit installment dialog state
  const [editInstallmentDialogOpen, setEditInstallmentDialogOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<TransactionWithDetails | null>(null);
  const [editInstallmentOption, setEditInstallmentOption] = useState<EditInstallmentOption | null>(null);

  // Pay transaction dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState<TransactionWithDetails | null>(null);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Consolidated filter state
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    status: (initialFilters.status as TransactionStatus) || 'all',
    type: 'all',
    category: initialFilters.category || 'all',
    tag: 'all',
    account: initialFilters.account || 'all',
    urgent: initialFilters.urgent,
    search: initialFilters.search || '',
  }));

  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(() => parseInt(initialMonth.split('-')[0]));

  const debouncedSearch = useDebounce(filters.search, 400);

  // localStorage state with proper hydration
  const [groupCardTransactions, setGroupCardTransactions] = useLocalStorageState('finance:groupCardTransactions', true);

  // Update individual filter
  const updateFilter = useCallback(<K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Sync filters with URL changes
  useEffect(() => {
    const urlAccountId = searchParams.get('account_id');
    const urlMonth = searchParams.get('month');
    const urlStatus = searchParams.get('status');
    const urlUrgent = searchParams.get('urgent');

    if (urlAccountId && urlAccountId !== filters.account) {
      updateFilter('account', urlAccountId);
    }
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) && urlMonth !== selectedMonth) {
      setSelectedMonth(urlMonth);
      setSelectedYear(parseInt(urlMonth.split('-')[0]));
    }
    if (urlStatus && ['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO'].includes(urlStatus) && urlStatus !== filters.status) {
      updateFilter('status', urlStatus as TransactionStatus);
    }
    const isUrgent = urlUrgent === 'true';
    if (isUrgent !== filters.urgent) {
      updateFilter('urgent', isUrgent);
    }
  }, [searchParams, filters.account, filters.status, filters.urgent, selectedMonth, updateFilter]);

  // Update URL when account filter changes
  const handleAccountFilterChange = useCallback((value: string) => {
    updateFilter('account', value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('account_id');
    } else {
      params.set('account_id', value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/financas/transacoes';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router, updateFilter]);

  // Sync search with URL
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    const newSearch = debouncedSearch.trim();

    if (currentSearch === newSearch) return;

    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) {
      params.set('search', newSearch);
    } else {
      params.delete('search');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/financas/transacoes';
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, searchParams, router]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.type !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.tag !== 'all') count++;
    if (filters.account !== 'all') count++;
    if (filters.urgent) count++;
    if (filters.search.length > 0) count++;
    return count;
  }, [filters]);

  // Check if any filter is active
  const hasActiveFilters = activeFiltersCount > 0;

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      type: 'all',
      category: 'all',
      tag: 'all',
      account: 'all',
      urgent: false,
      search: '',
    });
    router.replace('/financas/transacoes', { scroll: false });
  }, [router]);

  // Accordion state
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Ref to track last loaded filters (avoid unnecessary reload)
  const lastLoadedFiltersRef = useRef<string | null>(null);

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    // Create key for current filters
    const filtersKey = JSON.stringify({
      selectedMonth,
      ...filters,
      search: debouncedSearch,
    });

    // If already loaded with these filters and not forced, don't reload
    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build filters
      const apiFilters: Record<string, string | number> = {};

      // Filter by selected month
      // Expand to include previous month for card transactions
      // that belong to the selected month's invoice
      const [year, month] = selectedMonth.split('-').map(Number);
      apiFilters.start_date = new Date(year, month - 2, 1).toISOString().split('T')[0];
      apiFilters.end_date = new Date(year, month, 0).toISOString().split('T')[0];

      if (filters.status !== 'all') {
        apiFilters.status = filters.status;
      }

      if (filters.type !== 'all') {
        apiFilters.type = filters.type;
      }

      if (filters.category !== 'all') {
        apiFilters.category_id = filters.category;
      }

      if (filters.tag !== 'all') {
        apiFilters.tag_id = filters.tag;
      }

      if (filters.account !== 'all') {
        apiFilters.account_id = filters.account;
      }

      if (debouncedSearch.trim().length >= 2) {
        apiFilters.search = debouncedSearch.trim();
      }

      const [transactionsData, categoriesData, tagsData, accountsData, cardsData, goalsData, summaryData] =
        await Promise.all([
          financeApi.getTransactions(session.access_token, apiFilters),
          financeApi.getCategories(session.access_token),
          financeApi.getTags(session.access_token),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
          financeApi.getGoalsForSelect(session.access_token),
          financeApi.getDashboardSummary(session.access_token, selectedMonth),
        ]);

      setTransactions(transactionsData);
      setCategories(categoriesData);
      setTags(tagsData);
      setAccounts(accountsData);
      setCreditCards(cardsData);
      setGoals(goalsData);
      setSummary(summaryData);

      // Save loaded filters
      lastLoadedFiltersRef.current = filtersKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth, filters, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadData(true);
  });

  // Separate account transactions and group card transactions by invoice
  const { accountTransactions, invoiceGroups } = useMemo(() => {
    return groupTransactionsByInvoice(
      transactions,
      selectedMonth,
      groupCardTransactions,
      filters.urgent
    );
  }, [transactions, selectedMonth, groupCardTransactions, filters.urgent]);

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    let totalIncome = 0;
    let totalExpense = 0;

    for (const id of selectedIds) {
      const tx = accountTransactions.find((t) => t.id === id);
      if (tx && tx.status !== 'CANCELADO') {
        if (tx.type === 'RECEITA') {
          totalIncome += tx.amount;
        } else if (tx.type === 'DESPESA') {
          totalExpense += tx.amount;
        }
      }
    }

    return {
      count: selectedIds.length,
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
    };
  }, [rowSelection, accountTransactions]);

  // Clear row selection when filters change
  useEffect(() => {
    setRowSelection({});
  }, [selectedMonth, filters, debouncedSearch]);

  const toggleInvoice = (key: string) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const currentMonthNum = selectedMonth.split('-')[1];
    setSelectedMonth(`${year}-${currentMonthNum}`);
  };

  // Transaction handlers
  const handlePayTransaction = useCallback((transaction: TransactionWithDetails) => {
    setTransactionToPay(transaction);
    setPayDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((transaction: TransactionWithDetails) => {
    if (transaction.recurrence_id) {
      setTransactionToEdit(transaction);
      setEditRecurrenceDialogOpen(true);
      return;
    }

    if (transaction.installment_group_id) {
      setInstallmentToEdit(transaction);
      setEditInstallmentDialogOpen(true);
      return;
    }

    setEditingTransaction(transaction);
    setDialogOpen(true);
  }, []);

  const handleCancelTransaction = useCallback(async (transaction: TransactionWithDetails) => {
    if (!session?.access_token) return;

    if (transaction.recurrence_id) {
      setTransactionToDelete(transaction);
      setDeleteRecurrenceDialogOpen(true);
      return;
    }

    if (transaction.transfer_id) {
      setConfirmDialogConfig({
        title: 'Cancelar transferencia',
        description: 'Ambas as transacoes serao canceladas e os saldos das contas serao revertidos.',
        variant: 'warning',
        onConfirm: async () => {
          try {
            await financeApi.cancelTransfer(transaction.transfer_id!, session.access_token);
            loadData(true);
          } catch (err) {
            console.error('Error canceling transfer:', err);
          }
        },
      });
      setConfirmDialogOpen(true);
      return;
    }

    setConfirmDialogConfig({
      title: 'Cancelar transacao',
      description: `Deseja cancelar "${transaction.description}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await financeApi.cancelTransaction(transaction.id, session.access_token);
          loadData(true);
        } catch (err) {
          console.error('Error canceling transaction:', err);
        }
      },
    });
    setConfirmDialogOpen(true);
  }, [session?.access_token, loadData]);

  // Stable handlers ref for columns (prevents re-renders)
  const handlersRef = useRef({
    onPay: handlePayTransaction,
    onEdit: openEditDialog,
    onCancel: handleCancelTransaction,
  });

  useEffect(() => {
    handlersRef.current = {
      onPay: handlePayTransaction,
      onEdit: openEditDialog,
      onCancel: handleCancelTransaction,
    };
  }, [handlePayTransaction, openEditDialog, handleCancelTransaction]);

  // Get columns with stable handlers (refs prevent re-creation)
  const columns = useMemo(
    () =>
      getTransactionColumns({
        onPay: (tx) => handlersRef.current.onPay(tx),
        onEdit: (tx) => handlersRef.current.onEdit(tx),
        onCancel: (tx) => handlersRef.current.onCancel(tx),
        getInvoiceDueDate,
        enableSelection: true,
      }),
    []
  );

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!session?.access_token) return;

    if (data.is_installment && data.total_installments && data.total_installments > 1) {
      await financeApi.createInstallmentTransaction(
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          type: data.type,
          description: data.description,
          total_amount: data.amount,
          total_installments: data.total_installments,
          first_due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
        },
        session.access_token
      );
    } else if (editingTransaction && editingTransaction.recurrence_id && editRecurrenceOption) {
      await financeApi.updateRecurrenceTransaction(
        editingTransaction.id,
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
          goal_id: data.goal_id,
        },
        editRecurrenceOption,
        session.access_token
      );
      setEditRecurrenceOption(null);
      setTransactionToEdit(null);
    } else if (editingTransaction && editingTransaction.installment_group_id && editInstallmentOption) {
      await financeApi.updateInstallmentTransaction(
        editingTransaction.id,
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
          goal_id: data.goal_id,
        },
        editInstallmentOption,
        session.access_token
      );
      setEditInstallmentOption(null);
      setInstallmentToEdit(null);
    } else if (editingTransaction) {
      await financeApi.updateTransaction(
        editingTransaction.id,
        {
          type: data.type,
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
          goal_id: data.goal_id,
        },
        session.access_token
      );
    } else {
      await financeApi.createTransaction(
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          type: data.type,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
          goal_id: data.goal_id,
        },
        session.access_token
      );
    }

    setEditingTransaction(null);
    loadData(true);
  };

  const handleCreateRecurrence = async (data: RecurrenceFormData, generateCount?: number) => {
    if (!session?.access_token) return;

    const created = await financeApi.createRecurrence(data, session.access_token);
    if (generateCount && generateCount > 1) {
      await financeApi.generateRecurrenceOccurrences(
        created.id,
        generateCount - 1,
        session.access_token
      );
    }
    loadData(true);
  };

  const handleCreateCategory = async (data: CategoryFormData): Promise<FinanceCategory> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createCategory(data, session.access_token);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const handleCreateTag = async (data: TagFormData): Promise<FinanceTag> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createTag(data, session.access_token);
    setTags((prev) => [...prev, created]);
    return created;
  };

  const handleCreateTransfer = async (data: TransferFormData) => {
    if (!session?.access_token) return;
    await financeApi.createTransfer(data, session.access_token);
    loadData(true);
  };

  const handlePayConfirm = async (data: PayTransactionData) => {
    if (!session?.access_token || !transactionToPay) return;

    try {
      await financeApi.payTransaction(
        transactionToPay.id,
        {
          paid_amount: data.paid_amount,
          payment_date: data.payment_date,
          account_id: data.account_id,
        },
        session.access_token
      );
      toast.success(
        transactionToPay.type === 'RECEITA'
          ? 'Receita efetivada com sucesso'
          : 'Despesa efetivada com sucesso'
      );
      loadData(true);
    } catch (err) {
      console.error('Error paying transaction:', err);
      toast.apiError(err, 'Erro ao efetivar transacao');
      throw err;
    }
  };

  const handleDeleteRecurrenceConfirm = async (option: DeleteRecurrenceOption) => {
    if (!session?.access_token || !transactionToDelete) return;

    await financeApi.cancelRecurrenceTransaction(
      transactionToDelete.id,
      option,
      session.access_token
    );
    setTransactionToDelete(null);
    loadData(true);
  };

  const handleEditRecurrenceConfirm = (option: EditRecurrenceOption) => {
    if (!transactionToEdit) return;

    setEditRecurrenceOption(option);
    setEditingTransaction(transactionToEdit);
    setEditRecurrenceDialogOpen(false);
    setDialogOpen(true);
  };

  const handleEditInstallmentConfirm = (option: EditInstallmentOption) => {
    if (!installmentToEdit) return;

    setEditInstallmentOption(option);
    setEditingTransaction(installmentToEdit);
    setEditInstallmentDialogOpen(false);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData()} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  const hasNoData = accountTransactions.length === 0 && invoiceGroups.length === 0;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-3">
            <YearSelector
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              range={3}
            />
          </div>

          <Tabs value={selectedMonth} onValueChange={setSelectedMonth}>
            <TabsList className="w-full grid grid-cols-12 h-9 p-0.5 bg-slate-100/80">
              {MONTH_LABELS.map((label, index) => {
                const monthValue = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
                const now = new Date();
                const isCurrentMonth =
                  selectedYear === now.getFullYear() &&
                  index === now.getMonth();

                return (
                  <TabsTrigger
                    key={monthValue}
                    value={monthValue}
                    className={cn(
                      "text-xs font-medium rounded-md transition-all px-0",
                      "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                      isCurrentMonth && "data-[state=inactive]:text-blue-600 data-[state=inactive]:font-semibold"
                    )}
                  >
                    {label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards */}
        {summary && <TransactionsSummaryCards summary={summary} accounts={accounts} />}

        {/* Filters and Export */}
        <div className="flex items-center justify-between">
          <TransactionFiltersSheet
            searchTerm={filters.search}
            typeFilter={filters.type}
            statusFilter={filters.status}
            categoryFilter={filters.category}
            tagFilter={filters.tag}
            accountFilter={filters.account}
            urgentFilter={filters.urgent}
            groupCardTransactions={groupCardTransactions}
            onSearchChange={(v) => updateFilter('search', v)}
            onTypeChange={(v) => updateFilter('type', v)}
            onStatusChange={(v) => updateFilter('status', v)}
            onCategoryChange={(v) => updateFilter('category', v)}
            onTagChange={(v) => updateFilter('tag', v)}
            onAccountChange={handleAccountFilterChange}
            onUrgentChange={(v) => updateFilter('urgent', v)}
            onGroupCardTransactionsChange={setGroupCardTransactions}
            onClearFilters={handleClearFilters}
            categories={categories}
            tags={tags}
            accounts={accounts}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={hasNoData}
            className="h-8 gap-1.5"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Invoice Groups (Accordion) */}
        {groupCardTransactions && invoiceGroups.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Faturas de Cartao
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {invoiceGroups.map((group) => {
                const key = `${group.cardId}-${group.invoiceMonth}`;
                const isExpanded = expandedInvoices.has(key);

                return (
                  <Fragment key={key}>
                    <div
                      className="cursor-pointer bg-white transition-colors hover:bg-slate-50/50"
                      onClick={() => toggleInvoice(key)}
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-md"
                            style={{ backgroundColor: group.cardColor + '20' }}
                          >
                            <CreditCard
                              className="h-4 w-4"
                              style={{ color: group.cardColor }}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              Fatura {group.cardName} - {formatMonthLabel(group.invoiceMonth)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {group.transactions.length} transacao{group.transactions.length !== 1 && 'es'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                              getInvoiceStatusStyles(group.status)
                            )}
                          >
                            {getInvoiceStatusLabel(group.status)}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-red-600">
                            -{formatCurrency(Math.abs(group.total))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50/30 px-4 py-2">
                        <DataTable
                          columns={columns}
                          data={group.transactions}
                          enablePagination={false}
                          enableSorting={true}
                          emptyMessage="Nenhuma transacao nesta fatura"
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <DataTable
          columns={columns}
          data={accountTransactions}
          enableSorting={true}
          enablePagination={true}
          pageSize={20}
          isLoading={loading}
          emptyMessage="Nenhuma transacao encontrada"
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
        />

        {/* Selection Summary Bar */}
        <SelectionSummaryBar
          summary={selectionSummary}
          onClear={() => setRowSelection({})}
        />
      </div>

      {/* Transaction Dialog */}
      {dialogOpen && (
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveTransaction}
          onCreateCategory={handleCreateCategory}
          onCreateTag={handleCreateTag}
          onCreateRecurrence={handleCreateRecurrence}
          onCreateTransfer={handleCreateTransfer}
          transaction={editingTransaction}
          categories={categories}
          tags={tags}
          accounts={accounts}
          creditCards={creditCards}
          goals={goals}
        />
      )}

      {/* Delete Recurrence Transaction Dialog */}
      {transactionToDelete && deleteRecurrenceDialogOpen && (
        <DeleteRecurrenceTransactionDialog
          open={deleteRecurrenceDialogOpen}
          onOpenChange={setDeleteRecurrenceDialogOpen}
          onConfirm={handleDeleteRecurrenceConfirm}
          transaction={transactionToDelete}
        />
      )}

      {/* Edit Recurrence Transaction Dialog */}
      {transactionToEdit && editRecurrenceDialogOpen && (
        <EditRecurrenceTransactionDialog
          open={editRecurrenceDialogOpen}
          onOpenChange={setEditRecurrenceDialogOpen}
          onConfirm={handleEditRecurrenceConfirm}
          transaction={transactionToEdit}
        />
      )}

      {/* Edit Installment Transaction Dialog */}
      {installmentToEdit && editInstallmentDialogOpen && (
        <EditInstallmentTransactionDialog
          open={editInstallmentDialogOpen}
          onOpenChange={setEditInstallmentDialogOpen}
          onConfirm={handleEditInstallmentConfirm}
          transaction={installmentToEdit}
        />
      )}

      {/* Pay Transaction Dialog */}
      {payDialogOpen && (
        <PayTransactionDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          transaction={transactionToPay}
          accounts={accounts}
          onConfirm={handlePayConfirm}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialogConfig && (
        <ConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title={confirmDialogConfig.title}
          description={confirmDialogConfig.description}
          variant={confirmDialogConfig.variant}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          onConfirm={confirmDialogConfig.onConfirm}
        />
      )}

      {/* Export Dialog */}
      {exportDialogOpen && (
        <ExportTransactionsDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          transactions={[
            ...accountTransactions,
            ...invoiceGroups.flatMap((g) => g.transactions),
          ]}
          selectedMonth={selectedMonth}
          creditCards={creditCards}
        />
      )}
    </PageShell>
  );
}
