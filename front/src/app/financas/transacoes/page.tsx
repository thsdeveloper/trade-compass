'use client';

import { useEffect, useState, useCallback, useMemo, Fragment, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { TransactionDialog } from '@/components/organisms/finance/TransactionDialog';
import { DeleteRecurrenceTransactionDialog, type DeleteRecurrenceOption } from '@/components/organisms/finance/DeleteRecurrenceTransactionDialog';
import { EditRecurrenceTransactionDialog, type EditRecurrenceOption } from '@/components/organisms/finance/EditRecurrenceTransactionDialog';
import { EditInstallmentTransactionDialog, type EditInstallmentOption } from '@/components/organisms/finance/EditInstallmentTransactionDialog';
import { PayTransactionDialog } from '@/components/organisms/finance/PayTransactionDialog';
import { ExportTransactionsDialog } from '@/components/organisms/finance/ExportTransactionsDialog';
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
import { TransactionsSummaryCards } from '@/components/molecules/TransactionsSummaryCards';
import { getTransactionColumns } from './columns';
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
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface InvoiceGroup {
  cardId: string;
  cardName: string;
  cardColor: string;
  invoiceMonth: string;
  transactions: TransactionWithDetails[];
  total: number;
  status: 'PENDENTE' | 'PAGO' | 'PARCIAL';
}

function getInvoiceMonth(dueDate: string, closingDay: number): string {
  const date = new Date(dueDate + 'T12:00:00');
  const day = date.getDate();

  if (day > closingDay) {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().slice(0, 7);
}

function formatMonthLabel(invoiceMonth: string): string {
  const [year, month] = invoiceMonth.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

function getInvoiceDueDate(dueDate: string, closingDay: number, dueDay: number): string {
  const invoiceMonth = getInvoiceMonth(dueDate, closingDay);
  const [, month] = invoiceMonth.split('-');
  return `${String(dueDay).padStart(2, '0')}/${month}`;
}

function TransacoesPageContent() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [tags, setTags] = useState<FinanceTag[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [goals, setGoals] = useState<GoalSelectItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

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

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      return urlMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      return parseInt(urlMonth.split('-')[0]);
    }
    return new Date().getFullYear();
  });
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && ['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO'].includes(urlStatus)) {
      return urlStatus as TransactionStatus;
    }
    return 'all';
  });
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(() => {
    return searchParams.get('account_id') || 'all';
  });
  const [urgentFilter, setUrgentFilter] = useState<boolean>(() => {
    return searchParams.get('urgent') === 'true';
  });
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams.get('search') || '';
  });
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [groupCardTransactions, setGroupCardTransactions] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('finance:groupCardTransactions');
    return stored !== null ? stored === 'true' : true;
  });

  // Persist group card transactions preference
  useEffect(() => {
    localStorage.setItem('finance:groupCardTransactions', String(groupCardTransactions));
  }, [groupCardTransactions]);

  // Sync filters with URL changes
  useEffect(() => {
    const urlAccountId = searchParams.get('account_id');
    const urlMonth = searchParams.get('month');
    const urlStatus = searchParams.get('status');
    const urlUrgent = searchParams.get('urgent');

    if (urlAccountId && urlAccountId !== accountFilter) {
      setAccountFilter(urlAccountId);
    }
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) && urlMonth !== selectedMonth) {
      setSelectedMonth(urlMonth);
      setSelectedYear(parseInt(urlMonth.split('-')[0]));
    }
    if (urlStatus && ['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO'].includes(urlStatus) && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus as TransactionStatus);
    }
    const isUrgent = urlUrgent === 'true';
    if (isUrgent !== urgentFilter) {
      setUrgentFilter(isUrgent);
    }
  }, [searchParams]);

  // Update URL when account filter changes
  const handleAccountFilterChange = useCallback((value: string) => {
    setAccountFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('account_id');
    } else {
      params.set('account_id', value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/financas/transacoes';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // Sync search com URL
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
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (tagFilter !== 'all') count++;
    if (accountFilter !== 'all') count++;
    if (urgentFilter) count++;
    if (searchTerm.length > 0) count++;
    return count;
  }, [statusFilter, typeFilter, categoryFilter, tagFilter, accountFilter, urgentFilter, searchTerm]);

  // Check if any filter is active
  const hasActiveFilters = activeFiltersCount > 0;

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setTagFilter('all');
    setAccountFilter('all');
    setUrgentFilter(false);
    setSearchTerm('');
    router.replace('/financas/transacoes', { scroll: false });
  }, [router]);

  // Accordion state
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Ref para rastrear os ultimos filtros carregados (evitar reload desnecessario)
  const lastLoadedFiltersRef = useRef<string | null>(null);

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    // Criar chave dos filtros atuais
    const filtersKey = JSON.stringify({
      selectedMonth,
      statusFilter,
      typeFilter,
      categoryFilter,
      tagFilter,
      accountFilter,
      search: debouncedSearch,
    });

    // Se ja carregou com esses filtros e nao e forcado, nao recarregar
    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build filters
      const filters: Record<string, string | number> = {};

      // Filtrar pelo mes selecionado
      // Expandir para incluir o mes anterior para pegar transacoes de cartao
      // que pertencem a fatura do mes selecionado (ex: compra em 15/12 na fatura de Jan)
      const [year, month] = selectedMonth.split('-').map(Number);
      filters.start_date = new Date(year, month - 2, 1).toISOString().split('T')[0];
      filters.end_date = new Date(year, month, 0).toISOString().split('T')[0];

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        filters.type = typeFilter;
      }

      if (categoryFilter !== 'all') {
        filters.category_id = categoryFilter;
      }

      if (tagFilter !== 'all') {
        filters.tag_id = tagFilter;
      }

      if (accountFilter !== 'all') {
        filters.account_id = accountFilter;
      }

      if (debouncedSearch.trim().length >= 2) {
        filters.search = debouncedSearch.trim();
      }

      const [transactionsData, categoriesData, tagsData, accountsData, cardsData, goalsData, summaryData] =
        await Promise.all([
          financeApi.getTransactions(session.access_token, filters),
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

      // Salvar os filtros carregados
      lastLoadedFiltersRef.current = filtersKey;
      setIsInitialLoad(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth, statusFilter, typeFilter, categoryFilter, tagFilter, accountFilter, debouncedSearch]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadData();
  }, [user, authLoading, router, loadData]);

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadData(true);
  });

  // Separar transacoes de conta e agrupar transacoes de cartao por fatura
  const { accountTransactions, invoiceGroups } = useMemo(() => {
    const accountTx: TransactionWithDetails[] = [];
    const cardTxMap = new Map<string, InvoiceGroup>();

    // Periodo do mes selecionado para filtrar transacoes de conta
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(selYear, selMonth - 1, 1);
    const monthEnd = new Date(selYear, selMonth, 0);

    // Para filtro urgente: calcular data limite (amanha)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Funcao para verificar se transacao e urgente (vencida, hoje ou amanha)
    const isUrgentTransaction = (dueDate: string): boolean => {
      const txDate = new Date(dueDate + 'T00:00:00');
      txDate.setHours(0, 0, 0, 0);
      return txDate <= tomorrow;
    };

    for (const tx of transactions) {
      if (tx.credit_card_id && tx.credit_card) {
        const invoiceMonth = getInvoiceMonth(tx.due_date, tx.credit_card.closing_day);

        // Se agrupamento desativado, mostrar transacoes de cartao como linhas normais
        if (!groupCardTransactions) {
          // Filtrar apenas transacoes cuja fatura e do mes selecionado
          if (invoiceMonth === selectedMonth) {
            // Aplicar filtro urgente se ativo
            if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
              accountTx.push(tx);
            }
          }
          continue;
        }

        const key = `${tx.credit_card_id}-${invoiceMonth}`;

        if (!cardTxMap.has(key)) {
          cardTxMap.set(key, {
            cardId: tx.credit_card_id,
            cardName: tx.credit_card.name,
            cardColor: tx.credit_card.color || '#64748b',
            invoiceMonth,
            transactions: [],
            total: 0,
            status: 'PENDENTE',
          });
        }

        const group = cardTxMap.get(key)!;
        // Aplicar filtro urgente se ativo
        if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
          group.transactions.push(tx);
          group.total += tx.amount;
        }
      } else {
        // Transacoes de conta: filtrar apenas as do mes selecionado
        const txDate = new Date(tx.due_date + 'T12:00:00');
        if (txDate >= monthStart && txDate <= monthEnd) {
          // Aplicar filtro urgente se ativo
          if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
            accountTx.push(tx);
          }
        }
      }
    }

    // Determinar status de cada fatura
    for (const group of cardTxMap.values()) {
      const allPaid = group.transactions.every(tx => tx.status === 'PAGO');
      const anyPaid = group.transactions.some(tx => tx.status === 'PAGO');

      if (allPaid) {
        group.status = 'PAGO';
      } else if (anyPaid) {
        group.status = 'PARCIAL';
      } else {
        group.status = 'PENDENTE';
      }
    }

    // Filtrar apenas faturas do mes selecionado com transacoes e ordenar
    const groups = Array.from(cardTxMap.values())
      .filter(g => g.invoiceMonth === selectedMonth && g.transactions.length > 0)
      .sort((a, b) => b.invoiceMonth.localeCompare(a.invoiceMonth));

    // Ordenar transacoes por data de vencimento
    accountTx.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return { accountTransactions: accountTx, invoiceGroups: groups };
  }, [transactions, selectedMonth, groupCardTransactions, urgentFilter]);

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
  }, [selectedMonth, statusFilter, typeFilter, categoryFilter, tagFilter, accountFilter, urgentFilter, debouncedSearch]);

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

  const handlePayTransaction = (transaction: TransactionWithDetails) => {
    setTransactionToPay(transaction);
    setPayDialogOpen(true);
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

  const handleCancelTransaction = async (transaction: TransactionWithDetails) => {
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

  const openEditDialog = (transaction: TransactionWithDetails) => {
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

  const getInvoiceStatusStyles = (status: 'PENDENTE' | 'PAGO' | 'PARCIAL') => {
    switch (status) {
      case 'PAGO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARCIAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PENDENTE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getInvoiceStatusLabel = (status: 'PENDENTE' | 'PAGO' | 'PARCIAL') => {
    switch (status) {
      case 'PAGO':
        return 'Fatura Paga';
      case 'PARCIAL':
        return 'Fatura Parcial';
      case 'PENDENTE':
        return 'Fatura Aberta';
    }
  };

  // Get columns with handlers
  const columns = useMemo(
    () =>
      getTransactionColumns({
        onPay: handlePayTransaction,
        onEdit: openEditDialog,
        onCancel: handleCancelTransaction,
        getInvoiceDueDate,
        enableSelection: true,
      }),
    []
  );

  if (authLoading || (loading && isInitialLoad)) {
    return <TransacoesPageSkeleton />;
  }

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
            searchTerm={searchTerm}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            tagFilter={tagFilter}
            accountFilter={accountFilter}
            urgentFilter={urgentFilter}
            groupCardTransactions={groupCardTransactions}
            onSearchChange={setSearchTerm}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
            onTagChange={setTagFilter}
            onAccountChange={handleAccountFilterChange}
            onUrgentChange={setUrgentFilter}
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
          isLoading={loading && !isInitialLoad}
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

      {/* Delete Recurrence Transaction Dialog */}
      {transactionToDelete && (
        <DeleteRecurrenceTransactionDialog
          open={deleteRecurrenceDialogOpen}
          onOpenChange={setDeleteRecurrenceDialogOpen}
          onConfirm={handleDeleteRecurrenceConfirm}
          transaction={transactionToDelete}
        />
      )}

      {/* Edit Recurrence Transaction Dialog */}
      {transactionToEdit && (
        <EditRecurrenceTransactionDialog
          open={editRecurrenceDialogOpen}
          onOpenChange={setEditRecurrenceDialogOpen}
          onConfirm={handleEditRecurrenceConfirm}
          transaction={transactionToEdit}
        />
      )}

      {/* Edit Installment Transaction Dialog */}
      {installmentToEdit && (
        <EditInstallmentTransactionDialog
          open={editInstallmentDialogOpen}
          onOpenChange={setEditInstallmentDialogOpen}
          onConfirm={handleEditInstallmentConfirm}
          transaction={installmentToEdit}
        />
      )}

      {/* Pay Transaction Dialog */}
      <PayTransactionDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        transaction={transactionToPay}
        accounts={accounts}
        onConfirm={handlePayConfirm}
      />

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
    </PageShell>
  );
}

export default function TransacoesPage() {
  return (
    <Suspense fallback={<TransacoesPageSkeleton />}>
      <TransacoesPageContent />
    </Suspense>
  );
}
