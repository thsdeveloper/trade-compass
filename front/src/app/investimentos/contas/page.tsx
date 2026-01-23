'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  AlertCircle,
  Landmark,
  Pencil,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ContasPageSkeleton } from '@/components/organisms/skeletons/ContasPageSkeleton';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { useConfirm } from '@/components/molecules/ConfirmDialog';
import type {
  AccountWithBank,
  AccountFormData,
  Bank,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import { BankSelect } from '@/components/molecules/BankSelect';
import { ColorPicker } from '@/components/atoms/CategoryIcon';
import { CurrencyInput } from '@/components/ui/currency-input';

export default function ContasInvestimentoPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [popularBanks, setPopularBanks] = useState<Bank[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithBank | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'INVESTIMENTO',
    initial_balance: 0,
    color: '#8b5cf6',
    icon: 'Landmark',
    bank_id: '',
  });

  // Balance Adjustment Dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState<AccountWithBank | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'transaction' | 'initial_balance'>('transaction');
  const [newBalance, setNewBalance] = useState<number>(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState('Ajuste de saldo');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Ref para evitar reload desnecessario
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    if (!forceReload && hasLoadedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [accountsData, popularBanksData] = await Promise.all([
        financeApi.getAccounts(session.access_token),
        financeApi.getPopularBanks(session.access_token),
      ]);
      // Filtrar apenas contas de investimento
      const investmentAccounts = accountsData.filter(acc => acc.type === 'INVESTIMENTO');
      setAccounts(investmentAccounts);
      setPopularBanks(popularBanksData);
      setBanks(popularBanksData);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const handleSearchBanks = useCallback(async (query: string): Promise<Bank[]> => {
    if (!session?.access_token) return [];
    return financeApi.getBanks(session.access_token, query);
  }, [session?.access_token]);

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

  const openNewDialog = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'INVESTIMENTO',
      initial_balance: 0,
      color: '#8b5cf6',
      icon: 'Landmark',
      bank_id: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (account: AccountWithBank) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: 'INVESTIMENTO',
      initial_balance: account.initial_balance,
      color: account.color,
      icon: account.icon,
      bank_id: account.bank_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!session?.access_token) return;

    setSaving(true);
    try {
      if (editingAccount) {
        await financeApi.updateAccount(editingAccount.id, formData, session.access_token);
      } else {
        await financeApi.createAccount(formData, session.access_token);
      }
      setDialogOpen(false);
      loadData(true);
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: AccountWithBank) => {
    if (!session?.access_token) return;

    const confirmed = await confirm({
      title: 'Excluir conta de investimento',
      description: `Tem certeza que deseja excluir a conta "${account.name}"? Esta acao nao pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await financeApi.deleteAccount(account.id, session.access_token);
      toast.success('Conta removida com sucesso');
      loadData(true);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const openBalanceAdjustmentDialog = (account: AccountWithBank) => {
    setAdjustingAccount(account);
    setNewBalance(account.current_balance);
    setAdjustmentType('transaction');
    setAdjustmentDescription('Ajuste de saldo');
    setAdjustmentDialogOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingAccount || !session?.access_token) return;

    const diff = newBalance - adjustingAccount.current_balance;

    if (diff === 0) {
      toast.info('O saldo ja esta correto');
      setAdjustmentDialogOpen(false);
      return;
    }

    setSavingAdjustment(true);
    try {
      if (adjustmentType === 'transaction') {
        // Buscar categoria de ajuste apropriada
        const type = diff > 0 ? 'RECEITA' : 'DESPESA';
        const category = await financeApi.getAdjustmentCategory(type, session.access_token);

        // Criar transacao de ajuste ja paga
        const transaction = await financeApi.createTransaction({
          category_id: category.id,
          account_id: adjustingAccount.id,
          type,
          description: adjustmentDescription || 'Ajuste de saldo',
          amount: Math.abs(diff),
          due_date: new Date().toISOString().split('T')[0],
        }, session.access_token);

        // Pagar transacao imediatamente
        await financeApi.payTransaction(transaction.id, {
          paid_amount: Math.abs(diff),
          payment_date: new Date().toISOString().split('T')[0],
        }, session.access_token);
      } else {
        // Modificar saldo inicial
        const newInitialBalance = adjustingAccount.initial_balance + diff;
        await financeApi.updateAccount(
          adjustingAccount.id,
          { initial_balance: newInitialBalance },
          session.access_token
        );
      }

      toast.success('Saldo ajustado com sucesso');
      setAdjustmentDialogOpen(false);
      loadData(true);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
  const totalYield = totalBalance - totalInitial;
  const yieldPercentage = totalInitial > 0 ? (totalYield / totalInitial) * 100 : 0;

  if (authLoading || loading) {
    return <ContasPageSkeleton />;
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

  // Componente de card de conta
  const AccountCard = ({ account }: { account: AccountWithBank }) => {
    const balanceDiff = account.current_balance - account.initial_balance;
    const yieldPct = account.initial_balance > 0
      ? (balanceDiff / account.initial_balance) * 100
      : 0;

    return (
      <div
        className="group relative overflow-hidden rounded-xl border-0 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, ${account.color}12 0%, ${account.color}05 100%)`,
        }}
      >
        {/* Barra colorida no topo */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: account.color }}
        />

        {/* Decoracao circular no fundo */}
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10"
          style={{ backgroundColor: account.color }}
        />

        <div className="relative p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {account.bank?.logo_url ? (
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
                  style={{
                    backgroundColor: 'white',
                    border: `2px solid ${account.color}30`
                  }}
                >
                  <img
                    src={account.bank.logo_url}
                    alt={account.bank.name}
                    className="h-6 w-6 object-contain"
                  />
                </div>
              ) : (
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
                  style={{
                    backgroundColor: account.color,
                  }}
                >
                  <Landmark className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {account.name}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: account.color }}
                >
                  {account.bank?.name || 'Investimento'}
                </p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => router.push(`/financas/transacoes?account_id=${account.id}`)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Ver transacoes"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => openBalanceAdjustmentDialog(account)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-purple-50 hover:text-purple-600"
                title="Reajuste de saldo"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => openEditDialog(account)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-700"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(account)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-500"
                title="Excluir"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-4">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Saldo atual
                </p>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums tracking-tight',
                    account.current_balance >= 0
                      ? 'text-slate-800'
                      : 'text-red-600'
                  )}
                >
                  {formatCurrency(account.current_balance)}
                </p>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1',
                  balanceDiff >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                )}
              >
                <TrendingUp className={cn(
                  'h-3 w-3',
                  balanceDiff < 0 && 'rotate-180'
                )} />
                <span className="text-xs font-semibold tabular-nums">
                  {yieldPct >= 0 ? '+' : ''}
                  {yieldPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div
              className="mt-3 flex items-center justify-between border-t pt-2"
              style={{ borderColor: `${account.color}20` }}
            >
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Investido
                </span>
                <p className="text-xs font-medium tabular-nums text-slate-500">
                  {formatCurrency(account.initial_balance)}
                </p>
              </div>
              <div className="flex-1 text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Rendimento
                </span>
                <p className={cn(
                  'text-xs font-medium tabular-nums',
                  balanceDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {balanceDiff >= 0 ? '+' : ''}{formatCurrency(balanceDiff)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Investido */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Wallet className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500">Total Investido</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {formatCurrency(totalInitial)}
                </p>
              </div>
            </div>
          </div>

          {/* Saldo Atual */}
          <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Landmark className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-violet-700">Saldo Atual</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-violet-700">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-violet-600">{accounts.length}</p>
                <p className="text-[10px] text-violet-600">conta{accounts.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Rendimento Total */}
          <div className={cn(
            'rounded-lg border p-4',
            totalYield >= 0
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white'
              : 'border-red-200 bg-gradient-to-br from-red-50/50 to-white'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                totalYield >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              )}>
                <TrendingUp className={cn(
                  'h-5 w-5',
                  totalYield >= 0 ? 'text-emerald-600' : 'text-red-600 rotate-180'
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  'text-xs font-medium',
                  totalYield >= 0 ? 'text-emerald-700' : 'text-red-700'
                )}>Rendimento Total</p>
                <p className={cn(
                  'text-xl font-semibold tabular-nums tracking-tight',
                  totalYield >= 0 ? 'text-emerald-700' : 'text-red-700'
                )}>
                  {totalYield >= 0 ? '+' : ''}{formatCurrency(totalYield)}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-semibold',
                  totalYield >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {yieldPercentage >= 0 ? '+' : ''}{yieldPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
                <Landmark className="h-6 w-6 text-violet-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">Nenhuma conta de investimento cadastrada</p>
              <Button
                size="sm"
                className="mt-4 h-8 bg-violet-600 text-sm font-medium hover:bg-violet-700"
                onClick={openNewDialog}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar conta
              </Button>
            </div>
          </div>
        )}

        {/* Contas de Investimento Section */}
        {accounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-100">
                  <Landmark className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <h2 className="text-sm font-medium text-slate-900">Contas de Investimento</h2>
                <span className="text-xs text-slate-400">({accounts.length})</span>
              </div>
              <Button
                size="sm"
                className="h-8 bg-violet-600 text-sm font-medium hover:bg-violet-700"
                onClick={openNewDialog}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova conta
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingAccount ? 'Editar conta' : 'Nova conta de investimento'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingAccount ? 'Atualize os dados da conta' : 'Preencha os dados da conta de investimento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="initial_balance" className="text-xs font-medium text-slate-600">
                Saldo inicial (R$)
              </Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                value={formData.initial_balance || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initial_balance: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!!editingAccount}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Corretora / Banco
              </Label>
              <BankSelect
                value={formData.bank_id}
                onChange={(value) => setFormData({ ...formData, bank_id: value })}
                banks={banks}
                popularBanks={popularBanks}
                onSearch={handleSearchBanks}
                placeholder="Selecione a corretora"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-slate-600">
                Nome da conta
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Renda Fixa XP, Acoes BTG..."
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Cor
              </Label>
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-8"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.bank_id}
              className="h-8 bg-violet-600 hover:bg-violet-700"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Reajuste de saldo
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Ajuste o saldo da conta {adjustingAccount?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Saldo atual em destaque */}
            <div className="rounded-lg bg-violet-50 p-4">
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-1">
                Saldo atual
              </p>
              <p className="text-2xl font-bold text-violet-700 tabular-nums">
                {formatCurrency(adjustingAccount?.current_balance || 0)}
              </p>
            </div>

            {/* Saldo inicial da conta */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Saldo inicial da conta</span>
              <span className="font-medium text-slate-700 tabular-nums">
                {formatCurrency(adjustingAccount?.initial_balance || 0)}
              </span>
            </div>

            {/* Novo saldo */}
            <div className="space-y-1.5">
              <Label htmlFor="new_balance" className="text-xs font-medium text-slate-600">
                Novo saldo
              </Label>
              <CurrencyInput
                id="new_balance"
                value={newBalance}
                onChange={setNewBalance}
                showPrefix
                allowNegative
                className="h-9 text-sm"
              />
              {newBalance !== adjustingAccount?.current_balance && (
                <p className={cn(
                  'text-xs font-medium',
                  (newBalance - (adjustingAccount?.current_balance || 0)) > 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                )}>
                  Diferenca: {(newBalance - (adjustingAccount?.current_balance || 0)) > 0 ? '+' : ''}
                  {formatCurrency(newBalance - (adjustingAccount?.current_balance || 0))}
                </p>
              )}
            </div>

            {/* Opcoes */}
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Voce gostaria de...</p>

              {/* Opcao 1: Criar transacao */}
              <button
                type="button"
                onClick={() => setAdjustmentType('transaction')}
                className={cn(
                  'w-full rounded-lg border-2 p-3 text-left transition-all',
                  adjustmentType === 'transaction'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <p className={cn(
                  'text-sm font-medium',
                  adjustmentType === 'transaction' ? 'text-violet-700' : 'text-slate-700'
                )}>
                  Criar transacao de ajuste
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cria uma transacao de {(newBalance - (adjustingAccount?.current_balance || 0)) > 0 ? 'receita' : 'despesa'} para balancear o saldo
                </p>
              </button>

              {/* Opcao 2: Modificar saldo inicial */}
              <button
                type="button"
                onClick={() => setAdjustmentType('initial_balance')}
                className={cn(
                  'w-full rounded-lg border-2 p-3 text-left transition-all',
                  adjustmentType === 'initial_balance'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <p className={cn(
                  'text-sm font-medium',
                  adjustmentType === 'initial_balance' ? 'text-violet-700' : 'text-slate-700'
                )}>
                  Modificar saldo inicial
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Altera o saldo inicial da conta de{' '}
                  <span className="font-medium">{formatCurrency(adjustingAccount?.initial_balance || 0)}</span>
                  {' '}para{' '}
                  <span className="font-medium">
                    {formatCurrency((adjustingAccount?.initial_balance || 0) + (newBalance - (adjustingAccount?.current_balance || 0)))}
                  </span>
                </p>
              </button>
            </div>

            {/* Descricao (apenas para transacao) */}
            {adjustmentType === 'transaction' && (
              <div className="space-y-1.5">
                <Label htmlFor="adjustment_description" className="text-xs font-medium text-slate-600">
                  Descricao da transacao
                </Label>
                <Input
                  id="adjustment_description"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  placeholder="Ex: Ajuste de saldo"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustmentDialogOpen(false)}
              disabled={savingAdjustment}
              className="h-8"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdjustment}
              disabled={savingAdjustment || newBalance === adjustingAccount?.current_balance}
              className="h-8 bg-violet-600 hover:bg-violet-700"
            >
              {savingAdjustment && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </PageShell>
  );
}
