'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { DebtDialog } from '@/components/organisms/finance/DebtDialog';
import { NegotiationDialog } from '@/components/organisms/finance/NegotiationDialog';
import { GenerateTransactionsDialog } from '@/components/organisms/finance/GenerateTransactionsDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Handshake,
  Receipt,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { DividasPageSkeleton } from '@/components/organisms/skeletons/DividasPageSkeleton';
import { financeApi } from '@/lib/finance-api';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import type {
  DebtWithNegotiation,
  DebtStatus,
  DebtFormData,
  NegotiationFormData,
  GenerateTransactionsFormData,
  FinanceCategory,
  AccountWithBank,
  CategoryFormData,
} from '@/types/finance';
import {
  formatCurrency,
  DEBT_STATUS_LABELS,
  DEBT_TYPE_LABELS,
  getDebtStatusBgColor,
  NEGOTIATION_STATUS_LABELS,
} from '@/types/finance';

export default function DividasPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [debts, setDebts] = useState<DebtWithNegotiation[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<DebtStatus | 'all'>('all');

  // Dialogs
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtWithNegotiation | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtWithNegotiation | null>(null);

  // Ref para evitar reload desnecessário
  const lastLoadedFiltersRef = useRef<string | null>(null);

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    const filtersKey = JSON.stringify({ statusFilter });

    if (!forceReload && lastLoadedFiltersRef.current === filtersKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: { status?: DebtStatus } = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const [debtsData, categoriesData, accountsData] = await Promise.all([
        financeApi.getDebts(session.access_token, filters),
        financeApi.getCategories(session.access_token),
        financeApi.getAccounts(session.access_token),
      ]);

      setDebts(debtsData);
      setCategories(categoriesData);
      setAccounts(accountsData);

      lastLoadedFiltersRef.current = filtersKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dividas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, statusFilter]);

  useEffect(() => {
    if (!authLoading && session?.access_token) {
      loadData();
    }
  }, [authLoading, session?.access_token, loadData]);

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadData(true);
  });

  // Handlers
  const handleCreateDebt = () => {
    setEditingDebt(null);
    setDebtDialogOpen(true);
  };

  const handleEditDebt = (debt: DebtWithNegotiation) => {
    setEditingDebt(debt);
    setDebtDialogOpen(true);
  };

  const handleSaveDebt = async (data: DebtFormData) => {
    if (!session?.access_token) return;

    if (editingDebt) {
      await financeApi.updateDebt(editingDebt.id, data, session.access_token);
    } else {
      await financeApi.createDebt(data, session.access_token);
    }

    await loadData(true);
  };

  const handleDeleteDebt = async (debt: DebtWithNegotiation) => {
    if (!session?.access_token) return;
    if (!confirm(`Tem certeza que deseja cancelar a divida "${debt.creditor_name}"?`)) return;

    try {
      await financeApi.deleteDebt(debt.id, session.access_token);
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar divida';
      alert(message);
    }
  };

  const handleNegotiate = (debt: DebtWithNegotiation) => {
    setSelectedDebt(debt);
    setNegotiationDialogOpen(true);
  };

  const handleSaveNegotiation = async (data: NegotiationFormData) => {
    if (!session?.access_token || !selectedDebt) return;

    await financeApi.createNegotiation(selectedDebt.id, data, session.access_token);
    await loadData(true);
  };

  const handleGenerateTransactions = (debt: DebtWithNegotiation) => {
    if (!debt.active_negotiation) {
      alert('Esta divida nao possui uma negociacao ativa');
      return;
    }
    setSelectedDebt(debt);
    setGenerateDialogOpen(true);
  };

  const handleConfirmGenerateTransactions = async (data: GenerateTransactionsFormData) => {
    if (!session?.access_token || !selectedDebt || !selectedDebt.active_negotiation) return;

    await financeApi.generateTransactionsFromNegotiation(
      selectedDebt.id,
      selectedDebt.active_negotiation.id,
      data,
      session.access_token
    );
    await loadData(true);
  };

  const handleCreateCategory = async (data: CategoryFormData): Promise<FinanceCategory> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createCategory(data, session.access_token);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const handleMarkAsSettled = async (debt: DebtWithNegotiation) => {
    if (!session?.access_token) return;
    if (!confirm(`Marcar divida "${debt.creditor_name}" como quitada?`)) return;

    try {
      await financeApi.updateDebt(debt.id, { status: 'QUITADA' }, session.access_token);
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar divida';
      alert(message);
    }
  };

  // Summary calculations
  const summary = {
    total: debts.length,
    openAmount: debts
      .filter((d) => d.status === 'EM_ABERTO' || d.status === 'EM_NEGOCIACAO')
      .reduce((sum, d) => sum + d.updated_amount, 0),
    negotiatedAmount: debts
      .filter((d) => d.status === 'NEGOCIADA')
      .reduce((sum, d) => sum + (d.active_negotiation?.negotiated_value || d.updated_amount), 0),
  };

  if (authLoading || loading) {
    return <DividasPageSkeleton />;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total de Dividas</div>
            <div className="mt-1 text-2xl font-bold">{summary.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Valor em Aberto</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(summary.openAmount)}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Valor Negociado</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(summary.negotiatedAmount)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as DebtStatus | 'all')}
            >
              <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="EM_ABERTO">Em Aberto</SelectItem>
                <SelectItem value="EM_NEGOCIACAO">Em Negociacao</SelectItem>
                <SelectItem value="NEGOCIADA">Negociada</SelectItem>
                <SelectItem value="QUITADA">Quitada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!error && debts.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-card">
            <FileText className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma divida cadastrada
            </p>
            <Button className="mt-4" onClick={handleCreateDebt}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Divida
            </Button>
          </div>
        )}

        {/* Table */}
        {!error && debts.length > 0 && (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide">
                    Credor
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide">
                    Tipo
                  </TableHead>
                  <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-wide">
                    Valor Atual
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide">
                    Negociacao
                  </TableHead>
                  <TableHead className="h-10 w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id} className="group">
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium">{debt.creditor_name}</div>
                        {debt.contract_number && (
                          <div className="text-xs text-muted-foreground">
                            Contrato: {debt.contract_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {DEBT_TYPE_LABELS[debt.debt_type]}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums">
                      {formatCurrency(debt.updated_amount)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDebtStatusBgColor(
                          debt.status
                        )}`}
                      >
                        {DEBT_STATUS_LABELS[debt.status]}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {debt.active_negotiation ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {formatCurrency(debt.active_negotiation.negotiated_value)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {debt.active_negotiation.total_installments > 1
                              ? `${debt.active_negotiation.total_installments}x de ${formatCurrency(
                                  debt.active_negotiation.installment_value
                                )}`
                              : 'A vista'}
                            {' - '}
                            {NEGOTIATION_STATUS_LABELS[debt.active_negotiation.status]}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem negociacao</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditDebt(debt)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNegotiate(debt)}>
                            <Handshake className="mr-2 h-4 w-4" />
                            {debt.active_negotiation ? 'Nova Negociacao' : 'Negociar'}
                          </DropdownMenuItem>
                          {debt.active_negotiation &&
                            !debt.active_negotiation.transactions_generated && (
                              <DropdownMenuItem
                                onClick={() => handleGenerateTransactions(debt)}
                              >
                                <Receipt className="mr-2 h-4 w-4" />
                                Lancar Transacoes
                              </DropdownMenuItem>
                            )}
                          {debt.status === 'NEGOCIADA' && (
                            <DropdownMenuItem onClick={() => handleMarkAsSettled(debt)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marcar Quitada
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteDebt(debt)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialogs */}
        <DebtDialog
          open={debtDialogOpen}
          onOpenChange={setDebtDialogOpen}
          onSave={handleSaveDebt}
          debt={editingDebt}
        />

        {selectedDebt && (
          <>
            <NegotiationDialog
              open={negotiationDialogOpen}
              onOpenChange={setNegotiationDialogOpen}
              onSave={handleSaveNegotiation}
              debt={selectedDebt}
              existingNegotiation={selectedDebt.active_negotiation}
            />

            {selectedDebt.active_negotiation && (
              <GenerateTransactionsDialog
                open={generateDialogOpen}
                onOpenChange={setGenerateDialogOpen}
                onGenerate={handleConfirmGenerateTransactions}
                onCreateCategory={handleCreateCategory}
                debt={selectedDebt}
                negotiation={selectedDebt.active_negotiation}
                categories={categories}
                accounts={accounts}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
