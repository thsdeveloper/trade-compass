'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Target, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { financeApi } from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import type { GoalsProgressReportData } from '@/types/reports';
import { cn } from '@/lib/utils';

interface GoalsProgressReportProps {
  accessToken: string;
  startDate: string;
  endDate: string;
  includePending: boolean;
  refreshKey: number;
}

export function GoalsProgressReport({
  accessToken,
  refreshKey,
}: GoalsProgressReportProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GoalsProgressReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const result = await financeApi.getGoalsProgressReport(accessToken);
        setData(result);
        if (result.goals.length > 0 && !selectedGoal) {
          setSelectedGoal(result.goals[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, refreshKey]);

  if (loading) {
    return <GoalsProgressReportSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.goals.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <Target className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">Nenhum objetivo cadastrado</p>
      </div>
    );
  }

  const selectedGoalData = data.goals.find((g) => g.id === selectedGoal);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Target className="h-4 w-4 text-blue-500" />
            Objetivos Ativos
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.summary.active_goals}
          </p>
          <p className="text-xs text-slate-400">
            de {data.summary.total_goals} total
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Concluidos
          </div>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">
            {data.summary.completed_goals}
          </p>
          <p className="text-xs text-slate-400">
            objetivos alcancados
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Em Risco
          </div>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {data.summary.at_risk_goals}
          </p>
          <p className="text-xs text-slate-400">
            abaixo do esperado
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Progresso Geral
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {data.summary.overall_progress.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">
            {formatCurrency(data.summary.total_contributed)} de {formatCurrency(data.summary.total_target)}
          </p>
        </div>
      </div>

      {/* Goal Selector and Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals List */}
        <div className="rounded-lg border border-slate-200 bg-white lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">Seus Objetivos</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {data.goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  selectedGoal === goal.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon
                    icon={goal.icon}
                    color={goal.color}
                    size="sm"
                    withBackground
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {goal.name}
                      </p>
                      {goal.is_at_risk && (
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                      )}
                      {goal.status === 'CONCLUIDO' && (
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      )}
                    </div>
                    <div className="mt-1">
                      <Progress
                        value={goal.progress_percentage}
                        className="h-1.5"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {goal.progress_percentage.toFixed(0)}%
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatCurrency(goal.current_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal Details and Chart */}
        <div className="rounded-lg border border-slate-200 bg-white lg:col-span-2 p-6">
          {selectedGoalData ? (
            <>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={selectedGoalData.icon}
                      color={selectedGoalData.color}
                      size="md"
                      withBackground
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedGoalData.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Meta: {formatCurrency(selectedGoalData.target_amount)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedGoalData.progress_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(selectedGoalData.current_amount)} acumulado
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <Progress
                  value={selectedGoalData.progress_percentage}
                  className="h-3"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>R$ 0</span>
                  <span>{formatCurrency(selectedGoalData.target_amount)}</span>
                </div>
              </div>

              {/* Info Cards */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {selectedGoalData.deadline && (
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Prazo
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(selectedGoalData.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                {selectedGoalData.projected_completion && (
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Projecao</div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(selectedGoalData.projected_completion).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Status</div>
                  <p className={cn(
                    'mt-1 text-sm font-medium',
                    selectedGoalData.is_at_risk ? 'text-amber-600' :
                    selectedGoalData.status === 'CONCLUIDO' ? 'text-emerald-600' : 'text-blue-600'
                  )}>
                    {selectedGoalData.status === 'CONCLUIDO' ? 'Concluido' :
                     selectedGoalData.is_at_risk ? 'Em Risco' : 'No Caminho'}
                  </p>
                </div>
              </div>

              {/* Contributions Chart */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-slate-700">
                  Historico de Contribuicoes
                </h4>
                {selectedGoalData.monthly_contributions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={selectedGoalData.monthly_contributions}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v) => v.split('-')[1] + '/' + v.split('-')[0].slice(-2)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        labelFormatter={(label) => {
                          const [year, month] = String(label).split('-');
                          return `${month}/${year}`;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={selectedGoalData.color}
                        fill={selectedGoalData.color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center rounded-md bg-slate-50">
                    <p className="text-sm text-slate-400">Sem contribuicoes ainda</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Selecione um objetivo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalsProgressReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white lg:col-span-2 p-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  );
}
