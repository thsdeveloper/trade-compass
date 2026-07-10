'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Loader2, FileSpreadsheet, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { FinanceCreditCard, TransactionWithDetails } from '@/types/finance';
import {
  formatCurrency,
  TRANSACTION_STATUS_LABELS,
  CREDIT_CARD_BRAND_LABELS,
} from '@/types/finance';
import { financeApi } from '@/lib/finance-api';

interface ExportCreditCardTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCards: FinanceCreditCard[];
  accessToken: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${year}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumberForCSV(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(';') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface GroupedTransactions {
  cardName: string;
  cardBrand: string;
  transactions: TransactionWithDetails[];
  total: number;
}

function generateCSV(groups: GroupedTransactions[], selectedMonth: string): string {
  const lines: string[] = [];

  // BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF';

  // Main header
  lines.push(`TRANSACOES DE CARTOES DE CREDITO - ${formatMonthLabel(selectedMonth)}`);
  lines.push('');

  for (const group of groups) {
    // Card header
    lines.push(`CARTAO: ${group.cardName} (${CREDIT_CARD_BRAND_LABELS[group.cardBrand as keyof typeof CREDIT_CARD_BRAND_LABELS] || group.cardBrand})`);
    lines.push('');

    // Column headers
    lines.push([
      'Data Vencimento',
      'Data Pagamento',
      'Descricao',
      'Categoria',
      'Valor',
      'Valor Pago',
      'Status',
      'Tags',
      'Parcela',
      'Observacoes',
    ].join(';'));

    // Transactions
    for (const tx of group.transactions) {
      lines.push([
        formatDate(tx.due_date),
        tx.payment_date ? formatDate(tx.payment_date) : '',
        escapeCsvValue(tx.description),
        tx.category?.name || '',
        formatNumberForCSV(tx.amount),
        tx.paid_amount ? formatNumberForCSV(tx.paid_amount) : '',
        TRANSACTION_STATUS_LABELS[tx.status],
        tx.tags?.map((t) => t.name).join(', ') || '',
        tx.installment_number ? `${tx.installment_number}/${tx.total_installments}` : '',
        escapeCsvValue(tx.notes || ''),
      ].join(';'));
    }

    // Card subtotal
    lines.push('');
    lines.push(`SUBTOTAL ${group.cardName};;;;;${formatNumberForCSV(group.total)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Grand total
  const grandTotal = groups.reduce((sum, g) => sum + g.total, 0);
  const totalTransactions = groups.reduce((sum, g) => sum + g.transactions.length, 0);
  lines.push(`TOTAL GERAL;;;;;${formatNumberForCSV(grandTotal)}`);
  lines.push(`Total de transacoes: ${totalTransactions}`);

  return bom + lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportCreditCardTransactionsDialog({
  open,
  onOpenChange,
  creditCards,
  accessToken,
}: ExportCreditCardTransactionsDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);

  // Generate month options (last 12 months + current)
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatMonthLabel(value) };
  });

  // Preview transaction count when selection changes
  useEffect(() => {
    if (!open) return;

    const previewCount = async () => {
      setLoading(true);
      try {
        const cardsToFetch = selectedCardId === 'all'
          ? creditCards
          : creditCards.filter(c => c.id === selectedCardId);

        let count = 0;
        for (const card of cardsToFetch) {
          const invoice = await financeApi.getCreditCardInvoice(card.id, selectedMonth, accessToken);
          count += invoice.transactions.length;
        }
        setTransactionCount(count);
      } catch {
        setTransactionCount(null);
      } finally {
        setLoading(false);
      }
    };

    previewCount();
  }, [open, selectedCardId, selectedMonth, creditCards, accessToken]);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const cardsToFetch = selectedCardId === 'all'
        ? creditCards
        : creditCards.filter(c => c.id === selectedCardId);

      const groups: GroupedTransactions[] = [];

      for (const card of cardsToFetch) {
        const invoice = await financeApi.getCreditCardInvoice(card.id, selectedMonth, accessToken);

        if (invoice.transactions.length > 0) {
          groups.push({
            cardName: card.name,
            cardBrand: card.brand,
            transactions: invoice.transactions as TransactionWithDetails[],
            total: invoice.total,
          });
        }
      }

      if (groups.length === 0) {
        toast.warning('Nenhuma transacao para exportar no periodo selecionado');
        return;
      }

      const csv = generateCSV(groups, selectedMonth);
      const cardSuffix = selectedCardId === 'all' ? 'todos' : cardsToFetch[0]?.name.toLowerCase().replace(/\s+/g, '-');
      downloadFile(csv, `cartoes_${cardSuffix}_${selectedMonth}.csv`, 'text/csv;charset=utf-8');

      toast.success('Arquivo exportado com sucesso');
      onOpenChange(false);
    } catch (error) {
      toast.apiError(error, 'Erro ao exportar arquivo');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Exportar transacoes de cartoes
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Exporte as transacoes dos cartoes de credito.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Card Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Cartao</Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione um cartao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Todos os cartoes
                  </div>
                </SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: card.color }}
                      />
                      {card.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Mes da fatura</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Info */}
          <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
            <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">Formato: CSV (compativel com Excel)</span>
          </div>

          {/* Summary Info */}
          <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cartao</span>
              <span className="font-medium text-slate-700">
                {selectedCardId === 'all' ? 'Todos' : selectedCard?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Periodo</span>
              <span className="font-medium text-slate-700">{formatMonthLabel(selectedMonth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Transacoes</span>
              <span className="font-medium tabular-nums text-slate-700">
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : transactionCount !== null ? (
                  transactionCount
                ) : (
                  '-'
                )}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={generating}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={generating || loading || transactionCount === 0}
            className="h-9 bg-slate-900 hover:bg-slate-800"
          >
            {generating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {generating ? 'Gerando...' : 'Exportar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
