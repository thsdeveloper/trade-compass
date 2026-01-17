'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, FileSpreadsheet, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { TransactionWithDetails, FinanceCreditCard } from '@/types/finance';
import {
  formatCurrency,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  CREDIT_CARD_BRAND_LABELS,
} from '@/types/finance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportFormat = 'csv' | 'pdf';
type CardFilter = 'all' | 'cards_only' | string; // 'all', 'cards_only', or specific card ID

interface ExportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: TransactionWithDetails[];
  selectedMonth: string;
  creditCards?: FinanceCreditCard[];
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

function generateCSV(transactions: TransactionWithDetails[], groupByCard = false): string {
  // Se agrupar por cartao
  if (groupByCard) {
    return generateGroupedCSV(transactions);
  }

  const headers = [
    'Data Vencimento',
    'Data Pagamento',
    'Descricao',
    'Tipo',
    'Categoria',
    'Conta/Cartao',
    'Valor',
    'Valor Pago',
    'Status',
    'Tags',
    'Parcela',
    'Observacoes',
  ];

  const rows = transactions.map((tx) => [
    formatDate(tx.due_date),
    tx.payment_date ? formatDate(tx.payment_date) : '',
    escapeCsvValue(tx.description),
    TRANSACTION_TYPE_LABELS[tx.type],
    tx.category?.name || '',
    tx.credit_card?.name || tx.account?.name || '',
    formatNumberForCSV(tx.amount),
    tx.paid_amount ? formatNumberForCSV(tx.paid_amount) : '',
    TRANSACTION_STATUS_LABELS[tx.status],
    tx.tags?.map((t) => t.name).join(', ') || '',
    tx.installment_number ? `${tx.installment_number}/${tx.total_installments}` : '',
    escapeCsvValue(tx.notes || ''),
  ]);

  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + [headers, ...rows].map((row) => row.join(';')).join('\n');
}

function generateGroupedCSV(transactions: TransactionWithDetails[]): string {
  const lines: string[] = [];

  // Agrupar por cartao
  const groups = new Map<string, GroupedTransactions>();

  for (const tx of transactions) {
    if (!tx.credit_card) continue;

    const cardId = tx.credit_card_id || 'unknown';
    if (!groups.has(cardId)) {
      groups.set(cardId, {
        cardName: tx.credit_card.name,
        cardBrand: tx.credit_card.brand,
        transactions: [],
        total: 0,
      });
    }

    const group = groups.get(cardId)!;
    group.transactions.push(tx);
    group.total += tx.amount;
  }

  // Ordenar grupos por nome do cartao
  const sortedGroups = Array.from(groups.values()).sort((a, b) =>
    a.cardName.localeCompare(b.cardName)
  );

  for (const group of sortedGroups) {
    // Cabecalho do cartao
    const brandLabel = CREDIT_CARD_BRAND_LABELS[group.cardBrand as keyof typeof CREDIT_CARD_BRAND_LABELS] || group.cardBrand;
    lines.push(`CARTAO: ${group.cardName} (${brandLabel})`);
    lines.push('');

    // Cabecalhos das colunas
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

    // Ordenar transacoes por data
    const sortedTx = [...group.transactions].sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    );

    // Transacoes
    for (const tx of sortedTx) {
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

    // Subtotal do cartao
    lines.push('');
    lines.push(`SUBTOTAL ${group.cardName};;;;${formatNumberForCSV(group.total)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Total geral
  const grandTotal = sortedGroups.reduce((sum, g) => sum + g.total, 0);
  const totalTransactions = sortedGroups.reduce((sum, g) => sum + g.transactions.length, 0);
  lines.push(`TOTAL GERAL;;;;${formatNumberForCSV(grandTotal)}`);
  lines.push(`Total de transacoes: ${totalTransactions}`);

  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + lines.join('\n');
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

function calculateTotals(transactions: TransactionWithDetails[]) {
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    if (tx.status === 'CANCELADO') continue;
    const amount = tx.paid_amount ?? tx.amount;
    if (tx.type === 'RECEITA') {
      income += amount;
    } else if (tx.type === 'DESPESA') {
      expenses += amount;
    }
  }

  return {
    income,
    expenses,
    result: income - expenses,
  };
}

function generatePDF(
  transactions: TransactionWithDetails[],
  selectedMonth: string
): void {
  const doc = new jsPDF();
  const monthLabel = formatMonthLabel(selectedMonth);

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACOES FINANCEIRAS', 14, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel, 14, 28);

  // Table
  autoTable(doc, {
    startY: 35,
    head: [['Data', 'Descricao', 'Categoria', 'Valor', 'Status']],
    body: transactions.map((tx) => [
      formatDate(tx.due_date),
      tx.description.length > 40 ? tx.description.slice(0, 37) + '...' : tx.description,
      tx.category?.name || '-',
      formatCurrency(tx.type === 'RECEITA' ? tx.amount : -tx.amount),
      TRANSACTION_STATUS_LABELS[tx.status],
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 25 },
    },
  });

  // Summary
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const totals = calculateTotals(transactions);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Total Receitas: ${formatCurrency(totals.income)}`, 14, finalY);
  doc.text(`Total Despesas: ${formatCurrency(totals.expenses)}`, 14, finalY + 6);

  doc.setFont('helvetica', 'bold');
  const resultColor = totals.result >= 0 ? [16, 185, 129] : [239, 68, 68]; // emerald-500 or red-500
  doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.text(`Resultado: ${formatCurrency(totals.result)}`, 14, finalY + 14);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    14,
    doc.internal.pageSize.height - 10
  );

  doc.save(`transacoes_${selectedMonth}.pdf`);
}

export function ExportTransactionsDialog({
  open,
  onOpenChange,
  transactions,
  selectedMonth,
  creditCards = [],
}: ExportTransactionsDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [generating, setGenerating] = useState(false);

  // Filtrar transacoes com base na selecao de cartao
  const filteredTransactions = useMemo(() => {
    if (cardFilter === 'all') {
      return transactions;
    }

    if (cardFilter === 'cards_only') {
      return transactions.filter((tx) => tx.credit_card_id);
    }

    // Cartao especifico
    return transactions.filter((tx) => tx.credit_card_id === cardFilter);
  }, [transactions, cardFilter]);

  // Verificar se deve agrupar por cartao (quando filtrar por cartoes)
  const shouldGroupByCard = cardFilter !== 'all';

  // Cartoes unicos nas transacoes
  const cardsInTransactions = useMemo(() => {
    const uniqueCards = new Map<string, FinanceCreditCard>();
    for (const tx of transactions) {
      if (tx.credit_card && tx.credit_card_id) {
        uniqueCards.set(tx.credit_card_id, tx.credit_card);
      }
    }
    return Array.from(uniqueCards.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const handleExport = async () => {
    if (filteredTransactions.length === 0) {
      toast.warning('Nenhuma transacao para exportar');
      return;
    }

    setGenerating(true);
    try {
      if (format === 'csv') {
        const csv = generateCSV(filteredTransactions, shouldGroupByCard);
        const suffix = cardFilter === 'all' ? '' : cardFilter === 'cards_only' ? '_cartoes' : `_${cardsInTransactions.find(c => c.id === cardFilter)?.name.toLowerCase().replace(/\s+/g, '-') || 'cartao'}`;
        downloadFile(csv, `transacoes_${selectedMonth}${suffix}.csv`, 'text/csv;charset=utf-8');
      } else {
        generatePDF(filteredTransactions, selectedMonth);
      }
      toast.success('Arquivo exportado com sucesso');
      onOpenChange(false);
    } catch (error) {
      toast.apiError(error, 'Erro ao exportar arquivo');
    } finally {
      setGenerating(false);
    }
  };

  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Exportar transacoes
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Exporte as transacoes do periodo selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Card Filter Selection */}
          {cardsInTransactions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Filtrar por</Label>
              <Select value={cardFilter} onValueChange={setCardFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">
                    Todas as transacoes
                  </SelectItem>
                  <SelectItem value="cards_only" className="text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      Apenas cartoes (todos)
                    </div>
                  </SelectItem>
                  {cardsInTransactions.map((card) => (
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
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Formato</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                  format === 'csv'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                  format === 'pdf'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Info about grouping */}
          {shouldGroupByCard && format === 'csv' && (
            <div className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/50 p-3">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-700">
                O arquivo sera organizado por cartao
              </span>
            </div>
          )}

          {/* Summary Info */}
          <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Periodo</span>
              <span className="font-medium text-slate-700">{monthLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Transacoes</span>
              <span className="font-medium tabular-nums text-slate-700">
                {filteredTransactions.length}
              </span>
            </div>
            {shouldGroupByCard && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-medium tabular-nums text-slate-700">
                  {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                </span>
              </div>
            )}
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
            disabled={generating || filteredTransactions.length === 0}
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
