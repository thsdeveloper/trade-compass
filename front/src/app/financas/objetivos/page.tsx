'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Target,
  Pencil,
  X,
  Pause,
  Play,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { useConfirm } from '@/components/molecules/ConfirmDialog';
import { GoalDialog } from '@/components/organisms/finance/GoalDialog';
import { GoalContributionDialog } from '@/components/organisms/finance/GoalContributionDialog';
import { GoalContributionsHistoryDialog } from '@/components/organisms/finance/GoalContributionsHistoryDialog';
import { GoalProgressCard } from '@/components/molecules/GoalProgressCard';
import type {
  GoalWithProgress,
  GoalFormData,
  GoalSummary,
  AccountWithBank,
  FinanceGoalStatus,
  GoalContributionFormData,
} from '@/types/finance';
import { formatCurrency, GOAL_STATUS_LABELS } from '@/types/finance';

export default function ObjetivosPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);

  // Contribution dialog state
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<GoalWithProgress | null>(null);

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedGoalForHistory, setSelectedGoalForHistory] = useState<GoalWithProgress | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ATIVO');

  const hasLoadedRef = useRef(false);

  const loadData = useCallback(
    async (forceReload = false) => {
      if (!session?.access_token) return;

      if (!forceReload && hasLoadedRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const filters =
          statusFilter !== 'TODOS'
            ? { status: statusFilter as FinanceGoalStatus }
            : {};

        const [goalsData, summaryData, accountsData] = await Promise.all([
          financeApi.getGoals(session.access_token, filters),
          financeApi.getGoalSummary(session.access_token),
          financeApi.getAccounts(session.access_token),
        ]);

        setGoals(goalsData);
        setSummary(summaryData);
        setAccounts(accountsData);
        hasLoadedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token, statusFilter]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  useEffect(() => {
    hasLoadedRef.current = false;
    loadData();
  }, [statusFilter, loadData]);

  useFinanceDataRefresh(() => {
    loadData(true);
  });

  const openNewDialog = () => {
    setEditingGoal(null);
    setDialogOpen(true);
  };

  const openEditDialog = (goal: GoalWithProgress) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  const handleSave = async (data: GoalFormData) => {
    if (!session?.access_token) return;

    if (editingGoal) {
      await financeApi.updateGoal(editingGoal.id, data, session.access_token);
      toast.success('Objetivo atualizado com sucesso');
    } else {
      await financeApi.createGoal(data, session.access_token);
      toast.success('Objetivo criado com sucesso');
    }
    loadData(true);
  };

  const handleDelete = async (goal: GoalWithProgress) => {
    if (!session?.access_token) return;

    const confirmed = await confirm({
      title: 'Excluir objetivo',
      description: `Tem certeza que deseja excluir o objetivo "${goal.name}"?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await financeApi.deleteGoal(goal.id, session.access_token);
      toast.success('Objetivo removido com sucesso');
      loadData(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao remover objetivo'
      );
    }
  };

  const handleStatusChange = async (
    goal: GoalWithProgress,
    newStatus: FinanceGoalStatus
  ) => {
    if (!session?.access_token) return;

    try {
      await financeApi.updateGoal(
        goal.id,
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

  const openContributionDialog = (goal: GoalWithProgress) => {
    setSelectedGoalForContribution(goal);
    setContributionDialogOpen(true);
  };

  const openHistoryDialog = (goal: GoalWithProgress) => {
    setSelectedGoalForHistory(goal);
    setHistoryDialogOpen(true);
  };

  const handleSaveContribution = async (data: GoalContributionFormData) => {
    if (!session?.access_token || !selectedGoalForContribution) return;

    try {
      await financeApi.createGoalContribution(
        selectedGoalForContribution.id,
        data,
        session.access_token
      );
      toast.success('Contribuicao adicionada com sucesso');
      loadData(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao adicionar contribuicao'
      );
      throw err;
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
        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-400">
                Objetivos Ativos
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {summary.active_goals}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-400">Total Alvo</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {formatCurrency(summary.total_target)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-400">
                Total Contribuido
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">
                {formatCurrency(summary.total_contributed)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-400">
                Progresso Geral
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {summary.overall_progress.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {['ATIVO', 'PAUSADO', 'CONCLUIDO', 'TODOS'].map((status) => (
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
                : GOAL_STATUS_LABELS[status as keyof typeof GOAL_STATUS_LABELS]}
            </button>
          ))}
        </div>

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Target className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Nenhum objetivo encontrado
              </p>
              <Button
                size="sm"
                className="mt-4 h-8 bg-slate-900 hover:bg-slate-800"
                onClick={openNewDialog}
              >
                Criar objetivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div key={goal.id} className="group relative">
                <GoalProgressCard
                  goal={goal}
                  onClick={() => openEditDialog(goal)}
                  onAddContribution={() => openContributionDialog(goal)}
                  onViewHistory={() => openHistoryDialog(goal)}
                />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {goal.status === 'ATIVO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(goal, 'PAUSADO');
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-amber-50 hover:text-amber-600"
                      title="Pausar"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {goal.status === 'PAUSADO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(goal, 'ATIVO');
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-emerald-50 hover:text-emerald-600"
                      title="Retomar"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {goal.status === 'ATIVO' && goal.progress_percentage >= 100 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(goal, 'CONCLUIDO');
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-emerald-50 hover:text-emerald-600"
                      title="Marcar como concluido"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(goal);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-slate-700"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(goal);
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

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        goal={editingGoal}
        accounts={accounts}
      />

      <GoalContributionDialog
        open={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
        onSave={handleSaveContribution}
        goal={selectedGoalForContribution}
      />

      <GoalContributionsHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        goal={selectedGoalForHistory}
        accessToken={session?.access_token || ''}
      />

      {ConfirmDialog}
    </PageShell>
  );
}
