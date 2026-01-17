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
  Wallet,
  Pencil,
  X,
  Building2,
  Landmark,
  PiggyBank,
  Eye,
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
  FinanceAccountType,
  Bank,
} from '@/types/finance';
import {
  formatCurrency,
  ACCOUNT_TYPE_LABELS,
} from '@/types/finance';
import { BankSelect, BankLogo } from '@/components/molecules/BankSelect';
import { ColorPicker } from '@/components/atoms/CategoryIcon';

const getAccountIcon = (type: FinanceAccountType) => {
  switch (type) {
    case 'CONTA_CORRENTE':
      return Building2;
    case 'POUPANCA':
      return PiggyBank;
    case 'INVESTIMENTO':
      return Landmark;
    default:
      return Wallet;
  }
};

export default function ContasPage() {
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
    type: 'CONTA_CORRENTE',
    initial_balance: 0,
    color: '#64748b',
    icon: 'Wallet',
    bank_id: '',
  });

  // Ref para evitar reload desnecessário
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
      setAccounts(accountsData);
      setPopularBanks(popularBanksData);
      setBanks(popularBanksData); // Inicial com os populares
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
      type: 'CONTA_CORRENTE',
      initial_balance: 0,
      color: '#64748b',
      icon: 'Wallet',
      bank_id: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (account: AccountWithBank) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
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
      title: 'Excluir conta',
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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

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

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Total Balance Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Saldo Total
              </p>
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums tracking-tight',
                  totalBalance >= 0 ? 'text-slate-900' : 'text-red-600'
                )}
              >
                {formatCurrency(totalBalance)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Contas</p>
              <p className="text-sm font-medium text-slate-900">
                {accounts.length}
              </p>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                <Wallet className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">Nenhuma conta cadastrada</p>
              <Button
                size="sm"
                className="mt-4 h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
                onClick={openNewDialog}
              >
                Adicionar conta
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const Icon = getAccountIcon(account.type);
              const balanceDiff = account.current_balance - account.initial_balance;

              return (
                <div
                  key={account.id}
                  className="group relative overflow-hidden rounded-xl border-0 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
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
                            <Icon className="h-5 w-5 text-white" />
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
                            {account.bank?.name || ACCOUNT_TYPE_LABELS[account.type]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => router.push(`/financas/transacoes?account_id=${account.id}`)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Ver transações"
                        >
                          <Eye className="h-3.5 w-3.5" />
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
                          <span className="text-xs font-semibold tabular-nums">
                            {balanceDiff >= 0 ? '+' : ''}
                            {formatCurrency(balanceDiff)}
                          </span>
                        </div>
                      </div>

                      <div
                        className="mt-3 flex items-center justify-between border-t pt-2"
                        style={{ borderColor: `${account.color}20` }}
                      >
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                          Saldo inicial
                        </span>
                        <span className="text-xs font-medium tabular-nums text-slate-500">
                          {formatCurrency(account.initial_balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingAccount ? 'Editar conta' : 'Nova conta'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingAccount ? 'Atualize os dados da conta' : 'Preencha os dados da conta'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Banco
              </Label>
              <BankSelect
                value={formData.bank_id}
                onChange={(value) => setFormData({ ...formData, bank_id: value })}
                banks={banks}
                popularBanks={popularBanks}
                onSearch={handleSearchBanks}
                placeholder="Selecione o banco"
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
                placeholder="Ex: Conta Principal, Poupanca..."
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Tipo
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: FinanceAccountType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-sm">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </PageShell>
  );
}
