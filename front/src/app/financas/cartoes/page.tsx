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
  CreditCard,
  Pencil,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { financeApi } from '@/lib/finance-api';
import { PayInvoiceDialog } from '@/components/organisms/finance/PayInvoiceDialog';
import type {
  FinanceCreditCard,
  CreditCardFormData,
  CreditCardBrand,
  CreditCardInvoice,
  FinanceAccount,
  PayInvoiceFormData,
} from '@/types/finance';
import {
  formatCurrency,
  CREDIT_CARD_BRAND_LABELS,
  TRANSACTION_STATUS_LABELS,
  getStatusColor,
} from '@/types/finance';

export default function CartoesPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);

  // Invoice state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<FinanceCreditCard | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<CreditCardInvoice | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Pay invoice state
  const [payInvoiceDialogOpen, setPayInvoiceDialogOpen] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanceCreditCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreditCardFormData>({
    name: '',
    brand: 'VISA',
    total_limit: 0,
    closing_day: 1,
    due_day: 10,
    color: '#64748b',
  });

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const [cards, accs] = await Promise.all([
        financeApi.getCreditCards(session.access_token),
        financeApi.getAccounts(session.access_token),
      ]);
      setCreditCards(cards);
      setAccounts(accs);
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
    setEditingCard(null);
    setFormData({
      name: '',
      brand: 'VISA',
      total_limit: 0,
      closing_day: 1,
      due_day: 10,
      color: '#64748b',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (card: FinanceCreditCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      brand: card.brand,
      total_limit: card.total_limit,
      closing_day: card.closing_day,
      due_day: card.due_day,
      color: card.color,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!session?.access_token) return;

    setSaving(true);
    try {
      if (editingCard) {
        await financeApi.updateCreditCard(editingCard.id, formData, session.access_token);
      } else {
        await financeApi.createCreditCard(formData, session.access_token);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving card:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!session?.access_token) return;
    if (!confirm('Deseja remover este cartao?')) return;

    try {
      await financeApi.deleteCreditCard(cardId, session.access_token);
      loadData();
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  const openInvoiceDialog = async (card: FinanceCreditCard) => {
    if (!session?.access_token) return;

    setSelectedCard(card);
    setInvoiceDialogOpen(true);
    setLoadingInvoice(true);

    try {
      const invoice = await financeApi.getCreditCardInvoice(
        card.id,
        invoiceMonth,
        session.access_token
      );
      setCurrentInvoice(invoice);
    } catch (err) {
      console.error('Error loading invoice:', err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const changeInvoiceMonth = async (direction: 'prev' | 'next') => {
    if (!session?.access_token || !selectedCard) return;

    const [year, month] = invoiceMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setInvoiceMonth(newMonth);
    setLoadingInvoice(true);

    try {
      const invoice = await financeApi.getCreditCardInvoice(
        selectedCard.id,
        newMonth,
        session.access_token
      );
      setCurrentInvoice(invoice);
    } catch (err) {
      console.error('Error loading invoice:', err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePayInvoice = async (data: PayInvoiceFormData) => {
    if (!session?.access_token || !selectedCard) return;

    await financeApi.payInvoice(selectedCard.id, data, session.access_token);
    setPayInvoiceDialogOpen(false);
    setInvoiceDialogOpen(false);
    loadData();
  };

  const formatMonthDisplay = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

  const totalLimit = creditCards.reduce((sum, card) => sum + card.total_limit, 0);
  const totalAvailable = creditCards.reduce((sum, card) => sum + card.available_limit, 0);
  const totalUsed = totalLimit - totalAvailable;
  const usagePercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

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
                Cartoes de Credito
              </h1>
              <p className="text-sm text-slate-500">
                Gerencie seus cartoes
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
            onClick={openNewDialog}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo cartao
          </Button>
        </div>

        {/* Summary */}
        {creditCards.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Limite utilizado
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                    {formatCurrency(totalUsed)}
                  </span>
                  <span className="text-sm text-slate-400">
                    de {formatCurrency(totalLimit)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Disponivel</p>
                  <p className="text-sm font-medium tabular-nums text-emerald-600">
                    {formatCurrency(totalAvailable)}
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-100" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Uso</p>
                  <p className="text-sm font-medium tabular-nums text-slate-900">
                    {usagePercent.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-400 transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {creditCards.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                <CreditCard className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">Nenhum cartao cadastrado</p>
              <Button
                size="sm"
                className="mt-4 h-8 bg-slate-900 text-sm font-medium hover:bg-slate-800"
                onClick={openNewDialog}
              >
                Adicionar cartao
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((card) => {
              const cardUsed = card.total_limit - card.available_limit;
              const cardUsagePercent = card.total_limit > 0 ? (cardUsed / card.total_limit) * 100 : 0;

              return (
                <div
                  key={card.id}
                  className="group rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300"
                >
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-md"
                          style={{ backgroundColor: card.color + '15' }}
                        >
                          <CreditCard
                            className="h-4 w-4"
                            style={{ color: card.color }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {card.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {CREDIT_CARD_BRAND_LABELS[card.brand]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEditDialog(card)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Limite</span>
                        <span className="text-sm font-medium tabular-nums text-slate-900">
                          {formatCurrency(card.total_limit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Disponivel</span>
                        <span className="text-sm font-medium tabular-nums text-emerald-600">
                          {formatCurrency(card.available_limit)}
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(cardUsagePercent, 100)}%`,
                            backgroundColor: card.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Fecha</span>
                          <span className="text-xs font-medium text-slate-600">
                            dia {card.closing_day}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Vence</span>
                          <span className="text-xs font-medium text-slate-600">
                            dia {card.due_day}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-8 w-full text-xs"
                        onClick={() => openInvoiceDialog(card)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Ver fatura
                      </Button>
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
              {editingCard ? 'Editar cartao' : 'Novo cartao'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingCard ? 'Atualize os dados do cartao' : 'Preencha os dados do cartao'}
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
                placeholder="Ex: Nubank, Inter..."
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Bandeira
                </Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value: CreditCardBrand) =>
                    setFormData({ ...formData, brand: value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDIT_CARD_BRAND_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-sm">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="total_limit" className="text-xs font-medium text-slate-600">
                  Limite (R$)
                </Label>
                <Input
                  id="total_limit"
                  type="number"
                  step="0.01"
                  value={formData.total_limit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="closing_day" className="text-xs font-medium text-slate-600">
                  Dia fechamento
                </Label>
                <Input
                  id="closing_day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.closing_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      closing_day: parseInt(e.target.value) || 1,
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_day" className="text-xs font-medium text-slate-600">
                  Dia vencimento
                </Label>
                <Input
                  id="due_day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      due_day: parseInt(e.target.value) || 10,
                    })
                  }
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
              {editingCard ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4" />
              Fatura
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {selectedCard?.name} - {selectedCard?.brand}
            </DialogDescription>
          </DialogHeader>

          {/* Month Navigation */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <button
              onClick={() => changeInvoiceMonth('prev')}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium capitalize text-slate-700">
              {formatMonthDisplay(invoiceMonth)}
            </span>
            <button
              onClick={() => changeInvoiceMonth('next')}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {loadingInvoice ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : currentInvoice ? (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Total da fatura</p>
                    <p className="text-xl font-semibold tabular-nums text-slate-900">
                      {formatCurrency(currentInvoice.total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Vencimento</p>
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(currentInvoice.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="max-h-[240px] space-y-2 overflow-y-auto">
                {currentInvoice.transactions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">Nenhuma transacao nesta fatura</p>
                  </div>
                ) : (
                  currentInvoice.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-md border border-slate-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tx.category.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {tx.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(tx.due_date).toLocaleDateString('pt-BR')} -{' '}
                            <span className={getStatusColor(tx.status)}>
                              {TRANSACTION_STATUS_LABELS[tx.status]}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-slate-900">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Pay Invoice Button */}
              {currentInvoice.total > 0 && (
                <Button
                  className="h-9 w-full bg-slate-900 text-sm font-medium hover:bg-slate-800"
                  onClick={() => setPayInvoiceDialogOpen(true)}
                >
                  Pagar fatura
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Pay Invoice Dialog */}
      <PayInvoiceDialog
        open={payInvoiceDialogOpen}
        onOpenChange={setPayInvoiceDialogOpen}
        invoice={currentInvoice}
        accounts={accounts}
        onPayment={handlePayInvoice}
      />
    </PageShell>
  );
}
