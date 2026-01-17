'use client';

import { useEffect, useState, useCallback, useMemo, Fragment, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { TransactionDialog } from '@/components/organisms/finance/TransactionDialog';
import { DeleteRecurrenceTransactionDialog, type DeleteRecurrenceOption } from '@/components/organisms/finance/DeleteRecurrenceTransactionDialog';
import { PayTransactionDialog } from '@/components/organisms/finance/PayTransactionDialog';
import { ExportTransactionsDialog } from '@/components/organisms/finance/ExportTransactionsDialog';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import { AccountSelect } from '@/components/molecules/AccountSelect';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Check,
  X,
  Pencil,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowLeftRight,
  Download,
} from 'lucide-react';
import { TransacoesPageSkeleton } from '@/components/organisms/skeletons/TransacoesPageSkeleton';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
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
} from '@/types/finance';
import {
  formatCurrency,
  TRANSACTION_STATUS_LABELS,
} from '@/types/finance';

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

  // Se apos fechamento, vai para proxima fatura
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
  const [year, month] = invoiceMonth.split('-');
  return `${String(dueDay).padStart(2, '0')}/${month}`;
}

function TransacoesPageContent() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [tags, setTags] = useState<FinanceTag[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [goals, setGoals] = useState<GoalSelectItem[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  // Delete recurrence dialog state
  const [deleteRecurrenceDialogOpen, setDeleteRecurrenceDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithDetails | null>(null);

  // Pay transaction dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState<TransactionWithDetails | null>(null);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(() => {
    return searchParams.get('account_id') || 'all';
  });
  const [groupCardTransactions, setGroupCardTransactions] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('finance:groupCardTransactions');
    return stored !== null ? stored === 'true' : true;
  });

  // Persist group card transactions preference
  useEffect(() => {
    localStorage.setItem('finance:groupCardTransactions', String(groupCardTransactions));
  }, [groupCardTransactions]);

  // Sync account filter with URL changes
  useEffect(() => {
    const urlAccountId = searchParams.get('account_id');
    if (urlAccountId && urlAccountId !== accountFilter) {
      setAccountFilter(urlAccountId);
    } else if (!urlAccountId && accountFilter !== 'all') {
      // Keep filter if user changed it manually
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

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      typeFilter !== 'all' ||
      categoryFilter !== 'all' ||
      tagFilter !== 'all' ||
      accountFilter !== 'all'
    );
  }, [statusFilter, typeFilter, categoryFilter, tagFilter, accountFilter]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setTagFilter('all');
    setAccountFilter('all');
    router.replace('/financas/transacoes', { scroll: false });
  }, [router]);

  // Accordion state
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Ref para rastrear os últimos filtros carregados (evitar reload desnecessário)
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
    });

    // Se já carregou com esses filtros e não é forçado, não recarregar
    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build filters
      const filters: Record<string, string | number> = {};

      // Filtrar pelo mês selecionado
      // Expandir para incluir o mês anterior para pegar transações de cartão
      // que pertencem à fatura do mês selecionado (ex: compra em 15/12 na fatura de Jan)
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

      const [transactionsData, categoriesData, tagsData, accountsData, cardsData, goalsData] =
        await Promise.all([
          financeApi.getTransactions(session.access_token, filters),
          financeApi.getCategories(session.access_token),
          financeApi.getTags(session.access_token),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
          financeApi.getGoalsForSelect(session.access_token),
        ]);

      setTransactions(transactionsData);
      setCategories(categoriesData);
      setTags(tagsData);
      setAccounts(accountsData);
      setCreditCards(cardsData);
      setGoals(goalsData);

      // Salvar os filtros carregados
      lastLoadedFiltersRef.current = filtersKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedMonth, statusFilter, typeFilter, categoryFilter, tagFilter, accountFilter]);

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

    // Período do mês selecionado para filtrar transações de conta
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(selYear, selMonth - 1, 1);
    const monthEnd = new Date(selYear, selMonth, 0);

    for (const tx of transactions) {
      if (tx.credit_card_id && tx.credit_card) {
        const invoiceMonth = getInvoiceMonth(tx.due_date, tx.credit_card.closing_day);

        // Se agrupamento desativado, mostrar transações de cartão como linhas normais
        if (!groupCardTransactions) {
          // Filtrar apenas transações cuja fatura é do mês selecionado
          if (invoiceMonth === selectedMonth) {
            accountTx.push(tx);
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
        group.transactions.push(tx);
        group.total += tx.amount;
      } else {
        // Transações de conta: filtrar apenas as do mês selecionado
        const txDate = new Date(tx.due_date + 'T12:00:00');
        if (txDate >= monthStart && txDate <= monthEnd) {
          accountTx.push(tx);
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

    // Filtrar apenas faturas do mês selecionado e ordenar
    const groups = Array.from(cardTxMap.values())
      .filter(g => g.invoiceMonth === selectedMonth)
      .sort((a, b) => b.invoiceMonth.localeCompare(a.invoiceMonth));

    // Ordenar transações por data de vencimento
    accountTx.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return { accountTransactions: accountTx, invoiceGroups: groups };
  }, [transactions, selectedMonth, groupCardTransactions]);

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

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    const currentMonthNum = selectedMonth.split('-')[1];
    setSelectedMonth(`${newYear}-${currentMonthNum}`);
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
    } else if (editingTransaction) {
      await financeApi.updateTransaction(
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
    // Se solicitado, gerar transacoes antecipadas
    if (generateCount && generateCount > 1) {
      await financeApi.generateRecurrenceOccurrences(
        created.id,
        generateCount - 1, // -1 porque a primeira ja foi criada
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

    // Se for transacao de recorrencia, abrir dialog com opcoes
    if (transaction.recurrence_id) {
      setTransactionToDelete(transaction);
      setDeleteRecurrenceDialogOpen(true);
      return;
    }

    // Se for transferencia, cancelar via endpoint especifico
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

    // Transacao normal
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
    setEditingTransaction(transaction);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  const getStatusStyles = (status: TransactionStatus) => {
    switch (status) {
      case 'PAGO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDENTE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'VENCIDO':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELADO':
        return 'bg-slate-50 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
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

  if (authLoading || loading) {
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

  const renderTransactionRow = (transaction: TransactionWithDetails, isNested = false) => (
    <tr
      key={transaction.id}
      className={cn(
        'transition-colors hover:bg-slate-50/50',
        isNested && 'bg-slate-25'
      )}
    >
      <td className={cn('px-4 py-3', isNested && 'pl-12')}>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-900">
              {transaction.description}
            </p>
            {transaction.transfer_id && (
              <span title={`Transferencia ${transaction.type === 'DESPESA' ? 'para' : 'de'} ${transaction.transfer_counterpart_account?.name || 'outra conta'}`}>
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
              </span>
            )}
            {transaction.credit_card_id && !isNested && (
              <span title={transaction.credit_card?.name}>
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              </span>
            )}
          </div>
          {transaction.transfer_id && transaction.transfer_counterpart_account && (
            <p className="text-xs text-blue-500">
              {transaction.type === 'DESPESA' ? 'Para: ' : 'De: '}
              {transaction.transfer_counterpart_account.name}
            </p>
          )}
          {transaction.installment_number && (
            <p className="text-xs text-slate-400">
              Parcela {transaction.installment_number}/
              {transaction.total_installments}
            </p>
          )}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {transaction.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: '#6366f115',
                    color: '#6366f1',
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <CategoryIcon
            icon={transaction.category?.icon}
            color={transaction.category?.color}
            size="xs"
          />
          <span className="text-sm text-slate-600">
            {transaction.category?.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">
          {transaction.credit_card?.name || transaction.account?.name || '-'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm tabular-nums text-slate-600">
          {new Date(transaction.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            transaction.type === 'RECEITA'
              ? 'text-emerald-600'
              : transaction.transfer_id
                ? 'text-blue-600'
                : 'text-slate-900'
          )}
        >
          {transaction.type === 'RECEITA' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
            transaction.transfer_id
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : transaction.credit_card_id && transaction.status === 'PENDENTE'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : getStatusStyles(transaction.status)
          )}
        >
          {transaction.transfer_id
            ? 'Transferencia'
            : transaction.credit_card_id && transaction.credit_card && transaction.status === 'PENDENTE'
              ? `Na fatura de ${getInvoiceDueDate(transaction.due_date, transaction.credit_card.closing_day, transaction.credit_card.due_day)}`
              : TRANSACTION_STATUS_LABELS[transaction.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {transaction.status === 'PENDENTE' && !transaction.credit_card_id && !transaction.transfer_id && (
            <button
              onClick={() => handlePayTransaction(transaction)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Marcar como pago"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {!transaction.transfer_id && (
            <button
              onClick={() => openEditDialog(transaction)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {transaction.status !== 'CANCELADO' && (transaction.transfer_id || transaction.status !== 'PAGO') && (
            <button
              onClick={() => handleCancelTransaction(transaction)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title={transaction.transfer_id ? 'Cancelar transferencia' : 'Cancelar'}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const hasNoData = accountTransactions.length === 0 && invoiceGroups.length === 0;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Month Tabs */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleYearChange(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">{selectedYear}</span>
            <button
              onClick={() => handleYearChange(1)}
              disabled={selectedYear >= new Date().getFullYear()}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                selectedYear >= new Date().getFullYear()
                  ? "text-slate-200 cursor-not-allowed"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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

        {/* Other Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Select
            value={typeFilter}
            onValueChange={(value: TransactionType | 'all') => setTypeFilter(value)}
          >
            <SelectTrigger className="h-8 w-[150px] border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Todos tipos</SelectItem>
              <SelectItem value="DESPESA" className="text-sm">Despesa</SelectItem>
              <SelectItem value="RECEITA" className="text-sm">Receita</SelectItem>
              <SelectItem value="TRANSFERENCIA" className="text-sm">Transferencia</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value: TransactionStatus | 'all') => setStatusFilter(value)}
          >
            <SelectTrigger className="h-8 w-[130px] border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Todos status</SelectItem>
              <SelectItem value="PENDENTE" className="text-sm">Pendente</SelectItem>
              <SelectItem value="PAGO" className="text-sm">Pago</SelectItem>
              <SelectItem value="VENCIDO" className="text-sm">Vencido</SelectItem>
            </SelectContent>
          </Select>

          <CategorySelect
            value={categoryFilter === 'all' ? '' : categoryFilter}
            onChange={(value) => setCategoryFilter(value || 'all')}
            categories={categories}
            allowAll
            placeholder="Categoria"
            className="h-8 w-[180px]"
          />

          <Select
            value={tagFilter}
            onValueChange={(value) => setTagFilter(value)}
          >
            <SelectTrigger className="h-8 w-[150px] border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Todas tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id} className="text-sm">
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AccountSelect
            value={accountFilter}
            onChange={handleAccountFilterChange}
            accounts={accounts}
            allowAll
            placeholder="Conta"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-slate-500 hover:text-slate-700"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="group-card-transactions"
                checked={groupCardTransactions}
                onCheckedChange={setGroupCardTransactions}
              />
              <Label
                htmlFor="group-card-transactions"
                className="text-sm text-slate-600 cursor-pointer"
              >
                Agrupar faturas
              </Label>
            </div>
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
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Descricao
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Conta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hasNoData ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-slate-400">
                      Nenhuma transacao encontrada
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Faturas de cartao (accordion) */}
                  {invoiceGroups.map((group) => {
                    const key = `${group.cardId}-${group.invoiceMonth}`;
                    const isExpanded = expandedInvoices.has(key);

                    return (
                      <Fragment key={key}>
                        {/* Linha da fatura (cabecalho do accordion) */}
                        <tr
                          className="cursor-pointer bg-slate-50/30 transition-colors hover:bg-slate-50"
                          onClick={() => toggleInvoice(key)}
                        >
                          <td className="px-4 py-3" colSpan={3}>
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-md"
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
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-500">-</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              -{formatCurrency(group.total)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                                getInvoiceStatusStyles(group.status)
                              )}
                            >
                              {getInvoiceStatusLabel(group.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {/* Acoes da fatura podem ser adicionadas aqui */}
                          </td>
                        </tr>

                        {/* Transacoes da fatura (expandido) */}
                        {isExpanded &&
                          group.transactions.map((tx) => renderTransactionRow(tx, true))}
                      </Fragment>
                    );
                  })}

                  {/* Transacoes de conta */}
                  {accountTransactions.map((transaction) => renderTransactionRow(transaction))}
                </>
              )}
            </tbody>
          </table>
        </div>
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
