'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  Landmark,
  Pencil,
  X,
  Search,
  Plus,
  Calendar,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { useConfirm } from '@/components/molecules/ConfirmDialog';
import { FixedIncomeDialog } from '@/components/organisms/finance/FixedIncomeDialog';
import { FixedIncomeContributionDialog } from '@/components/organisms/finance/FixedIncomeContributionDialog';
import { FixedIncomeContributionHistoryDialog } from '@/components/organisms/finance/FixedIncomeContributionHistoryDialog';
import { FixedIncomeCard } from '@/components/molecules/FixedIncomeCard';
import { FixedIncomeSummaryCards } from '@/components/molecules/FixedIncomeSummaryCards';
import type {
  FixedIncomeWithContributions,
  FixedIncomeFormData,
  FixedIncomeSummary,
  FixedIncomeType,
  FixedIncomeStatus,
  FixedIncomeRateType,
  FixedIncomeContributionFormData,
  GoalSelectItem,
} from '@/types/finance';
import {
  formatCurrency,
  FIXED_INCOME_STATUS_LABELS,
  FIXED_INCOME_TYPE_LABELS,
  FIXED_INCOME_RATE_TYPE_LABELS,
} from '@/types/finance';

export default function RendaFixaPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<FixedIncomeWithContributions[]>([]);
  const [summary, setSummary] = useState<FixedIncomeSummary | null>(null);
  const [goals, setGoals] = useState<GoalSelectItem[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<FixedIncomeWithContributions | null>(null);

  // Contribution dialog state
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<FixedIncomeWithContributions | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ATIVO');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [rateTypeFilter, setRateTypeFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const hasLoadedRef = useRef(false);

  const loadData = useCallback(
    async (forceReload = false) => {
      if (!session?.access_token) return;

      if (!forceReload && hasLoadedRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const filters: {
          status?: FixedIncomeStatus;
          investment_type?: FixedIncomeType;
          rate_type?: FixedIncomeRateType;
          search?: string;
        } = {};

        if (statusFilter !== 'TODOS') {
          filters.status = statusFilter as FixedIncomeStatus;
        }
        if (typeFilter !== 'TODOS') {
          filters.investment_type = typeFilter as FixedIncomeType;
        }
        if (rateTypeFilter !== 'TODOS') {
          filters.rate_type = rateTypeFilter as FixedIncomeRateType;
        }
        if (searchQuery.trim().length >= 2) {
          filters.search = searchQuery.trim();
        }

        const [investmentsData, summaryData, goalsData] = await Promise.all([
          financeApi.getFixedIncomes(session.access_token, filters),
          financeApi.getFixedIncomeSummary(session.access_token),
          financeApi.getGoalsForSelect(session.access_token),
        ]);

        setInvestments(investmentsData);
        setSummary(summaryData);
        setGoals(goalsData);
        hasLoadedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token, statusFilter, typeFilter, rateTypeFilter, searchQuery]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  useEffect(() => {
    hasLoadedRef.current = false;
    loadData();
  }, [statusFilter, typeFilter, rateTypeFilter, loadData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2 || searchQuery.trim().length === 0) {
        hasLoadedRef.current = false;
        loadData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadData]);

  useFinanceDataRefresh(() => {
    loadData(true);
  });

  const openNewDialog = () => {
    setEditingInvestment(null);
    setDialogOpen(true);
  };

  const openEditDialog = (investment: FixedIncomeWithContributions) => {
    setEditingInvestment(investment);
    setDialogOpen(true);
  };

  const openContributionDialog = (investment: FixedIncomeWithContributions) => {
    setSelectedInvestment(investment);
    setContributionDialogOpen(true);
  };

  const openHistoryDialog = (investment: FixedIncomeWithContributions) => {
    setSelectedInvestment(investment);
    setHistoryDialogOpen(true);
  };

  const handleSaveContribution = async (data: FixedIncomeContributionFormData) => {
    if (!session?.access_token || !selectedInvestment) return;

    await financeApi.createFixedIncomeContribution(
      selectedInvestment.id,
      data,
      session.access_token
    );
    toast.success('Aporte registrado com sucesso');
    loadData(true);
  };

  const handleSave = async (data: FixedIncomeFormData) => {
    if (!session?.access_token) return;

    if (editingInvestment) {
      await financeApi.updateFixedIncome(editingInvestment.id, data, session.access_token);
      toast.success('Investimento atualizado com sucesso');
    } else {
      await financeApi.createFixedIncome(data, session.access_token);
      toast.success('Investimento criado com sucesso');
    }
    loadData(true);
  };

  const handleDelete = async (investment: FixedIncomeWithContributions) => {
    if (!session?.access_token) return;

    const confirmed = await confirm({
      title: 'Excluir investimento',
      description: `Tem certeza que deseja excluir o investimento "${investment.name}"?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await financeApi.deleteFixedIncome(investment.id, session.access_token);
      toast.success('Investimento removido com sucesso');
      loadData(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao remover investimento'
      );
    }
  };

  const handleStatusChange = async (
    investment: FixedIncomeWithContributions,
    newStatus: FixedIncomeStatus
  ) => {
    if (!session?.access_token) return;

    try {
      await financeApi.updateFixedIncome(
        investment.id,
        { status: newStatus },
        session.access_token
      );
      toast.success('Status atualizado');
      loadData(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao atualizar status'
      );
    }
  };

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-sm text-slate-500">Carregando...</div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData(true)}>
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Page Header with Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Renda Fixa</h1>
            <p className="text-sm text-slate-500">
              Acompanhe seus investimentos em renda fixa
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 bg-slate-900 hover:bg-slate-800"
            onClick={openNewDialog}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Investimento
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && <FixedIncomeSummaryCards summary={summary} />}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou emissor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['ATIVO', 'VENCIDO', 'RESGATADO', 'TODOS'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {status === 'TODOS'
                  ? 'Todos'
                  : FIXED_INCOME_STATUS_LABELS[status as FixedIncomeStatus]}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="TODOS">Todos os tipos</option>
            {Object.entries(FIXED_INCOME_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Rate Type Filter */}
          <select
            value={rateTypeFilter}
            onChange={(e) => setRateTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="TODOS">Todas as taxas</option>
            {Object.entries(FIXED_INCOME_RATE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Upcoming Maturities Alert */}
        {summary && summary.upcoming_maturities.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-900">
                Proximos Vencimentos (90 dias)
              </h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.upcoming_maturities.map((maturity) => (
                <div
                  key={maturity.id}
                  className="rounded-md bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <span className="font-medium text-slate-900">
                    {maturity.name}
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-600">
                    {new Date(maturity.maturity_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-emerald-600 font-medium">
                    {formatCurrency(maturity.estimated_final_value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investments Grid */}
        {investments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Landmark className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Nenhum investimento encontrado
              </p>
              <Button
                size="sm"
                className="mt-4 h-8 bg-slate-900 hover:bg-slate-800"
                onClick={openNewDialog}
              >
                Adicionar investimento
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {investments.map((investment) => (
              <div key={investment.id} className="group relative">
                <FixedIncomeCard
                  investment={investment}
                  onClick={() => openEditDialog(investment)}
                  onAddContribution={() => openContributionDialog(investment)}
                  onViewHistory={() => openHistoryDialog(investment)}
                />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {investment.status === 'ATIVO' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(investment, 'RESGATADO');
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-blue-50 hover:text-blue-600"
                        title="Marcar como resgatado"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(investment);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-slate-700"
                        title="Atualizar valor atual"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(investment);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-slate-700"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(investment);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-red-50 hover:text-red-500"
                    title="Excluir"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FixedIncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        investment={editingInvestment}
        goals={goals}
      />

      <FixedIncomeContributionDialog
        open={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
        onSave={handleSaveContribution}
        investment={selectedInvestment}
      />

      <FixedIncomeContributionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        investment={selectedInvestment}
        accessToken={session?.access_token || ''}
        onContributionDeleted={() => loadData(true)}
      />

      {ConfirmDialog}
    </PageShell>
  );
}
