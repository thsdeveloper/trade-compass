'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeApi } from '@/lib/finance-api';
import type {
  FinanceAccount,
  AccountFormData,
  FinanceAccountType,
} from '@/types/finance';
import {
  formatCurrency,
  ACCOUNT_TYPE_LABELS,
} from '@/types/finance';

const getAccountIcon = (type: FinanceAccountType) => {
  switch (type) {
    case 'CONTA_CORRENTE':
      return Building2;
    case 'CONTA_POUPANCA':
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'CONTA_CORRENTE',
    initial_balance: 0,
    color: '#64748b',
    icon: 'Wallet',
  });

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await financeApi.getAccounts(session.access_token);
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadData();
  }, [user, authLoading, router, loadData]);

  const openNewDialog = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'CONTA_CORRENTE',
      initial_balance: 0,
      color: '#64748b',
      icon: 'Wallet',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (account: FinanceAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      initial_balance: account.initial_balance,
      color: account.color,
      icon: account.icon,
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
      loadData();
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!session?.access_token) return;
    if (!confirm('Deseja remover esta conta?')) return;

    try {
      await financeApi.deleteAccount(accountId, session.access_token);
      loadData();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

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
                Contas
              </h1>
              <p className="text-sm text-slate-500">
                Gerencie suas contas bancarias
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
            onClick={openNewDialog}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova conta
          </Button>
        </div>

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
                  className="group rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300"
                >
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-md"
                          style={{ backgroundColor: account.color + '15' }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: account.color }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {account.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ACCOUNT_TYPE_LABELS[account.type]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEditDialog(account)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400">Saldo atual</p>
                        <p
                          className={cn(
                            'text-lg font-semibold tabular-nums',
                            account.current_balance >= 0
                              ? 'text-slate-900'
                              : 'text-red-600'
                          )}
                        >
                          {formatCurrency(account.current_balance)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-xs text-slate-400">Saldo inicial</p>
                          <p className="text-sm tabular-nums text-slate-600">
                            {formatCurrency(account.initial_balance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Variacao</p>
                          <p
                            className={cn(
                              'text-sm font-medium tabular-nums',
                              balanceDiff >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            )}
                          >
                            {balanceDiff >= 0 ? '+' : ''}
                            {formatCurrency(balanceDiff)}
                          </p>
                        </div>
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
              <Label htmlFor="name" className="text-xs font-medium text-slate-600">
                Nome
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Nubank, Itau, Carteira..."
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
              <Label htmlFor="color" className="text-xs font-medium text-slate-600">
                Cor
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-9 w-16 cursor-pointer p-1"
                />
                <span className="text-xs text-slate-400">{formData.color}</span>
              </div>
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
              disabled={saving || !formData.name}
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
