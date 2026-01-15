'use client';

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { TransactionDialog } from '@/components/organisms/finance/TransactionDialog';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  Pencil,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import type {
  TransactionWithDetails,
  FinanceCategory,
  FinanceAccount,
  FinanceCreditCard,
  TransactionFormData,
  TransactionStatus,
  TransactionType,
  CategoryFormData,
} from '@/types/finance';
import {
  formatCurrency,
  TRANSACTION_STATUS_LABELS,
} from '@/types/finance';

type DateFilter = 'month' | 'all';

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

export default function TransacoesPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Accordion state
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      // Build filters
      const filters: Record<string, string | number> = {};

      if (dateFilter === 'month') {
        const now = new Date();
        filters.start_date = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        filters.end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
      }

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        filters.type = typeFilter;
      }

      if (categoryFilter !== 'all') {
        filters.category_id = categoryFilter;
      }

      const [transactionsData, categoriesData, accountsData, cardsData] =
        await Promise.all([
          financeApi.getTransactions(session.access_token, filters),
          financeApi.getCategories(session.access_token),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
        ]);

      setTransactions(transactionsData);
      setCategories(categoriesData);
      setAccounts(accountsData);
      setCreditCards(cardsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, dateFilter, statusFilter, typeFilter, categoryFilter]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadData();
  }, [user, authLoading, router, loadData]);

  // Separar transacoes de conta e agrupar transacoes de cartao por fatura
  const { accountTransactions, invoiceGroups } = useMemo(() => {
    const accountTx: TransactionWithDetails[] = [];
    const cardTxMap = new Map<string, InvoiceGroup>();

    for (const tx of transactions) {
      if (tx.credit_card_id && tx.credit_card) {
        const invoiceMonth = getInvoiceMonth(tx.due_date, tx.credit_card.closing_day);
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
        accountTx.push(tx);
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

    // Ordenar faturas por mes (mais recente primeiro)
    const groups = Array.from(cardTxMap.values()).sort((a, b) =>
      b.invoiceMonth.localeCompare(a.invoiceMonth)
    );

    return { accountTransactions: accountTx, invoiceGroups: groups };
  }, [transactions]);

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
        },
        session.access_token
      );
    }

    setEditingTransaction(null);
    loadData();
  };

  const handleCreateCategory = async (data: CategoryFormData): Promise<FinanceCategory> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createCategory(data, session.access_token);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const handlePayTransaction = async (transactionId: string) => {
    if (!session?.access_token) return;

    try {
      await financeApi.payTransaction(transactionId, {}, session.access_token);
      loadData();
    } catch (err) {
      console.error('Error paying transaction:', err);
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    if (!session?.access_token) return;

    if (!confirm('Deseja cancelar esta transacao?')) return;

    try {
      await financeApi.cancelTransaction(transactionId, session.access_token);
      loadData();
    } catch (err) {
      console.error('Error canceling transaction:', err);
    }
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
        return 'Paga';
      case 'PARCIAL':
        return 'Parcial';
      case 'PENDENTE':
        return 'Aberta';
    }
  };

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
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
            {transaction.credit_card_id && !isNested && (
              <CreditCard
                className="h-3.5 w-3.5 text-slate-400"
                title={transaction.credit_card?.name}
              />
            )}
          </div>
          {transaction.installment_number && (
            <p className="text-xs text-slate-400">
              Parcela {transaction.installment_number}/
              {transaction.total_installments}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: transaction.category?.color }}
          />
          <span className="text-sm text-slate-600">
            {transaction.category?.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm tabular-nums text-slate-600">
          {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            transaction.type === 'RECEITA'
              ? 'text-emerald-600'
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
            transaction.credit_card_id && transaction.status === 'PENDENTE'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : getStatusStyles(transaction.status)
          )}
        >
          {transaction.credit_card_id && transaction.status === 'PENDENTE'
            ? 'Na fatura'
            : TRANSACTION_STATUS_LABELS[transaction.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {transaction.status === 'PENDENTE' && !transaction.credit_card_id && (
            <button
              onClick={() => handlePayTransaction(transaction.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Marcar como pago"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => openEditDialog(transaction)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {transaction.status !== 'CANCELADO' && (
            <button
              onClick={() => handleCancelTransaction(transaction.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Cancelar"
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/financas')}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Transacoes
              </h1>
              <p className="text-sm text-slate-500">
                Gerencie suas despesas e receitas
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
            onClick={openNewDialog}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova transacao
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Select
            value={dateFilter}
            onValueChange={(value: DateFilter) => setDateFilter(value)}
          >
            <SelectTrigger className="h-8 w-[130px] border-slate-200 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month" className="text-sm">Este mes</SelectItem>
              <SelectItem value="all" className="text-sm">Todas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value: TransactionType | 'all') => setTypeFilter(value)}
          >
            <SelectTrigger className="h-8 w-[130px] border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Todos tipos</SelectItem>
              <SelectItem value="DESPESA" className="text-sm">Despesa</SelectItem>
              <SelectItem value="RECEITA" className="text-sm">Receita</SelectItem>
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
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-sm text-slate-400">
                      Nenhuma transacao encontrada
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Transacoes de conta */}
                  {accountTransactions.map((transaction) => renderTransactionRow(transaction))}

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
                          <td className="px-4 py-3" colSpan={2}>
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
        transaction={editingTransaction}
        categories={categories}
        accounts={accounts}
        creditCards={creditCards}
      />
    </PageShell>
  );
}
