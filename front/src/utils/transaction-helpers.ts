import type { TransactionWithDetails } from '@/types/finance';

export type InvoiceStatus = 'PENDENTE' | 'PAGO' | 'PARCIAL';

export interface InvoiceGroup {
  cardId: string;
  cardName: string;
  cardColor: string;
  invoiceMonth: string;
  transactions: TransactionWithDetails[];
  total: number;
  status: InvoiceStatus;
}

/**
 * Calculate the invoice month for a credit card transaction
 * based on the due date and card closing day.
 */
export function getInvoiceMonth(dueDate: string, closingDay: number): string {
  const date = new Date(dueDate + 'T12:00:00');
  const day = date.getDate();

  if (day > closingDay) {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().slice(0, 7);
}

/**
 * Format an invoice month string (YYYY-MM) to a readable label.
 */
export function formatMonthLabel(invoiceMonth: string): string {
  const [year, month] = invoiceMonth.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

/**
 * Get the due date formatted for display (DD/MM).
 */
export function getInvoiceDueDate(dueDate: string, closingDay: number, dueDay: number): string {
  const invoiceMonth = getInvoiceMonth(dueDate, closingDay);
  const [, month] = invoiceMonth.split('-');
  return `${String(dueDay).padStart(2, '0')}/${month}`;
}

/**
 * Get CSS classes for invoice status badge.
 */
export function getInvoiceStatusStyles(status: InvoiceStatus): string {
  switch (status) {
    case 'PAGO':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PARCIAL':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'PENDENTE':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

/**
 * Get human-readable label for invoice status.
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'PAGO':
      return 'Fatura Paga';
    case 'PARCIAL':
      return 'Fatura Parcial';
    case 'PENDENTE':
      return 'Fatura Aberta';
  }
}

/**
 * Group transactions by credit card invoice and separate account transactions.
 * Applies urgent filter if enabled.
 */
export function groupTransactionsByInvoice(
  transactions: TransactionWithDetails[],
  selectedMonth: string,
  groupCardTransactions: boolean,
  urgentFilter: boolean
): { accountTransactions: TransactionWithDetails[]; invoiceGroups: InvoiceGroup[] } {
  const accountTx: TransactionWithDetails[] = [];
  const cardTxMap = new Map<string, InvoiceGroup>();

  // Period of the selected month to filter account transactions
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const monthStart = new Date(selYear, selMonth - 1, 1);
  const monthEnd = new Date(selYear, selMonth, 0);

  // For urgent filter: calculate limit date (tomorrow)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Function to check if transaction is urgent (overdue, today or tomorrow)
  const isUrgentTransaction = (dueDateStr: string): boolean => {
    const txDate = new Date(dueDateStr + 'T00:00:00');
    txDate.setHours(0, 0, 0, 0);
    return txDate <= tomorrow;
  };

  for (const tx of transactions) {
    if (tx.credit_card_id && tx.credit_card) {
      const invoiceMonth = getInvoiceMonth(tx.due_date, tx.credit_card.closing_day);

      // If grouping is disabled, show card transactions as normal rows
      if (!groupCardTransactions) {
        // Only filter transactions whose invoice is for the selected month
        if (invoiceMonth === selectedMonth) {
          // Apply urgent filter if active
          if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
            accountTx.push(tx);
          }
        }
        continue;
      }

      const key = `${tx.credit_card_id}-${invoiceMonth}`;

      if (!cardTxMap.has(key)) {
        cardTxMap.set(key, {
          cardId: tx.credit_card_id,
          cardName: tx.credit_card.name,
          cardColor: tx.credit_card.color || '#64748b',
          invoiceMonth,
          transactions: [],
          total: 0,
          status: 'PENDENTE',
        });
      }

      const group = cardTxMap.get(key)!;
      // Apply urgent filter if active
      if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
        group.transactions.push(tx);
        group.total += tx.amount;
      }
    } else {
      // Account transactions: filter only those in the selected month
      const txDate = new Date(tx.due_date + 'T12:00:00');
      if (txDate >= monthStart && txDate <= monthEnd) {
        // Apply urgent filter if active
        if (!urgentFilter || isUrgentTransaction(tx.due_date)) {
          accountTx.push(tx);
        }
      }
    }
  }

  // Determine status of each invoice
  for (const group of cardTxMap.values()) {
    const allPaid = group.transactions.every(tx => tx.status === 'PAGO');
    const anyPaid = group.transactions.some(tx => tx.status === 'PAGO');

    if (allPaid) {
      group.status = 'PAGO';
    } else if (anyPaid) {
      group.status = 'PARCIAL';
    } else {
      group.status = 'PENDENTE';
    }
  }

  // Filter only invoices for the selected month with transactions and sort
  const groups = Array.from(cardTxMap.values())
    .filter(g => g.invoiceMonth === selectedMonth && g.transactions.length > 0)
    .sort((a, b) => b.invoiceMonth.localeCompare(a.invoiceMonth));

  // Sort transactions by due date
  accountTx.sort((a, b) => a.due_date.localeCompare(b.due_date));

  return { accountTransactions: accountTx, invoiceGroups: groups };
}
