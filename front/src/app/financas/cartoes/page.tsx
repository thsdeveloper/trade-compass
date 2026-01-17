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
  CreditCard,
  Pencil,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { CartoesPageSkeleton } from '@/components/organisms/skeletons/CartoesPageSkeleton';
import { financeApi } from '@/lib/finance-api';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import { PayInvoiceDialog } from '@/components/organisms/finance/PayInvoiceDialog';
import { ExportCreditCardTransactionsDialog } from '@/components/organisms/finance/ExportCreditCardTransactionsDialog';
import type {
  FinanceCreditCard,
  CreditCardFormData,
  CreditCardBrand,
  CreditCardInvoice,
  AccountWithBank,
  PayInvoiceFormData,
} from '@/types/finance';
import {
  formatCurrency,
  CREDIT_CARD_BRAND_LABELS,
  TRANSACTION_STATUS_LABELS,
  getStatusColor,
} from '@/types/finance';
import { ColorPicker } from '@/components/atoms/CategoryIcon';

export default function CartoesPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);

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

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
      const [cards, accs] = await Promise.all([
        financeApi.getCreditCards(session.access_token),
        financeApi.getAccounts(session.access_token),
      ]);
      setCreditCards(cards);
      setAccounts(accs);
      hasLoadedRef.current = true;
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

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadData(true);
  });

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
      loadData(true);
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
      loadData(true);
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
    loadData(true);
  };

  const formatMonthDisplay = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (authLoading || loading) {
    return <CartoesPageSkeleton />;
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

  const totalLimit = creditCards.reduce((sum, card) => sum + card.total_limit, 0);
  const totalAvailable = creditCards.reduce((sum, card) => sum + card.available_limit, 0);
  const totalUsed = totalLimit - totalAvailable;
  const usagePercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  return (
    <PageShell>
      <div className="space-y-6">
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
                <div className="h-10 w-px bg-slate-100" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Exportar
                </Button>
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((card) => {
              const cardUsed = card.total_limit - card.available_limit;
              const cardUsagePercent = card.total_limit > 0 ? (cardUsed / card.total_limit) * 100 : 0;

              // Generate darker shade for gradient
              const darkenColor = (hex: string, percent: number) => {
                const num = parseInt(hex.replace('#', ''), 16);
                const amt = Math.round(2.55 * percent);
                const R = Math.max((num >> 16) - amt, 0);
                const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
                const B = Math.max((num & 0x0000FF) - amt, 0);
                return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
              };

              // Check if color is light to determine text color
              const isLightColor = (hex: string) => {
                const num = parseInt(hex.replace('#', ''), 16);
                const r = num >> 16;
                const g = (num >> 8) & 0x00FF;
                const b = num & 0x0000FF;
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                return brightness > 155;
              };

              const textColor = isLightColor(card.color) ? 'text-slate-800' : 'text-white';
              const textColorMuted = isLightColor(card.color) ? 'text-slate-600' : 'text-white/70';

              // Brand logos as SVG components
              const BrandLogo = () => {
                switch (card.brand) {
                  case 'VISA':
                    return (
                      <svg viewBox="0 0 48 16" className="h-6 w-auto" fill="currentColor">
                        <path d="M19.5 1.5L16.5 14.5H13L16 1.5H19.5ZM33.5 9.5L35.5 4L36.5 9.5H33.5ZM37.5 14.5H41L38 1.5H35C34.2 1.5 33.5 2 33.2 2.7L27.5 14.5H31.5L32.3 12H37.2L37.5 14.5ZM28.5 10C28.5 6 23 5.8 23 4C23 3.4 23.5 2.8 24.7 2.6C25.3 2.5 27 2.5 28.8 3.3L29.5 1.8C28.5 1.4 27.2 1 25.5 1C21.8 1 19.2 3 19.2 5.8C19.2 9.3 24 9.5 24 11.5C24 12.2 23.2 12.8 22 12.8C20.3 12.8 18.8 12.2 18 11.7L17.2 13.3C18.2 13.9 20 14.5 21.8 14.5C26 14.5 28.5 12.7 28.5 10ZM12 1.5L7 14.5H3L0.5 3.8C0.3 3 0 2.7 0 2.7H0C1.7 3.4 3.5 4.3 5 5.3L8.5 14.5H12.5L17 1.5H12Z" />
                      </svg>
                    );
                  case 'MASTERCARD':
                    return (
                      <svg viewBox="0 0 32 20" className="h-7 w-auto">
                        <circle cx="10" cy="10" r="10" fill="#EB001B" />
                        <circle cx="22" cy="10" r="10" fill="#F79E1B" />
                        <path d="M16 3.5a10 10 0 0 0 0 13 10 10 0 0 0 0-13z" fill="#FF5F00" />
                      </svg>
                    );
                  case 'ELO':
                    return (
                      <svg viewBox="0 0 40 16" className="h-6 w-auto">
                        <ellipse cx="8" cy="8" rx="6" ry="6" fill="#FFCB05" />
                        <ellipse cx="20" cy="8" rx="6" ry="6" fill="#00A4E0" />
                        <ellipse cx="32" cy="8" rx="6" ry="6" fill="#EF4123" />
                      </svg>
                    );
                  case 'AMEX':
                    return (
                      <svg viewBox="0 0 40 12" className="h-5 w-auto" fill="currentColor">
                        <path d="M0 6L3 0H6L9 6L6 12H3L0 6ZM10 0H13L15 4L17 0H20L16 6L20 12H17L15 8L13 12H10L14 6L10 0ZM21 0H28V2H24V5H28V7H24V10H28V12H21V0ZM30 0H37V2H33V5H37V7H33V10H37V12H30V0Z" />
                      </svg>
                    );
                  case 'HIPERCARD':
                    return (
                      <svg viewBox="0 0 40 14" className="h-5 w-auto">
                        <rect x="0" y="0" width="40" height="14" rx="2" fill="#B3131B" />
                        <text x="20" y="10" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">HIPER</text>
                      </svg>
                    );
                  default:
                    return (
                      <CreditCard className="h-6 w-6" />
                    );
                }
              };

              return (
                <div key={card.id} className="group flex flex-col gap-3">
                  {/* Credit Card Design */}
                  <div
                    className="relative aspect-[1.586/1] w-full cursor-pointer overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(135deg, ${card.color} 0%, ${darkenColor(card.color, 30)} 100%)`,
                    }}
                    onClick={() => openInvoiceDialog(card)}
                  >
                    {/* Pattern overlay */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      }}
                    />

                    {/* Top row: Chip and actions */}
                    <div className="flex items-start justify-between">
                      {/* Chip */}
                      <div className="h-9 w-12 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 shadow-inner">
                        <div className="flex h-full w-full flex-col justify-center gap-1 px-1.5">
                          <div className="h-0.5 w-full rounded-full bg-amber-500/40" />
                          <div className="h-0.5 w-full rounded-full bg-amber-500/40" />
                          <div className="h-0.5 w-full rounded-full bg-amber-500/40" />
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(card);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(card.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-red-500/50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card number placeholder */}
                    <div className={`mt-4 font-mono text-lg tracking-[0.2em] ${textColor}`}>
                      •••• •••• •••• ••••
                    </div>

                    {/* Bottom row: Name and Brand */}
                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] uppercase tracking-wider ${textColorMuted}`}>
                          Nome do cartao
                        </p>
                        <p className={`truncate text-sm font-semibold tracking-wide ${textColor}`}>
                          {card.name.toUpperCase()}
                        </p>
                      </div>
                      <div className={`ml-3 flex flex-col items-end ${textColor}`}>
                        <BrandLogo />
                        <p className={`mt-1 font-mono text-xs ${textColorMuted}`}>
                          {String(card.closing_day).padStart(2, '0')}/{String(card.due_day).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Info Below */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Limite total</span>
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(card.total_limit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Disponivel</span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600">
                          {formatCurrency(card.available_limit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Utilizado</span>
                        <span className="text-sm font-medium tabular-nums text-slate-500">
                          {formatCurrency(cardUsed)} ({cardUsagePercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(cardUsagePercent, 100)}%`,
                            backgroundColor: card.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Fecha dia</span>
                          <span className="font-semibold text-slate-700">{card.closing_day}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Vence dia</span>
                          <span className="font-semibold text-slate-700">{card.due_day}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full text-xs font-medium"
                        onClick={() => openInvoiceDialog(card)}
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
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
                      {currentInvoice.due_date.split('-').reverse().join('/')}
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
                            {tx.due_date.split('-').reverse().join('/')} -{' '}
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

      {/* Export Credit Card Transactions Dialog */}
      {session?.access_token && (
        <ExportCreditCardTransactionsDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          creditCards={creditCards}
          accessToken={session.access_token}
        />
      )}
    </PageShell>
  );
}
