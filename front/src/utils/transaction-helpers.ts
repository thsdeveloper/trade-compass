import type { TransactionWithDetails } from '@/types/finance';

export type InvoiceStatus = 'PENDENTE' | 'PAGO' | 'PARCIAL';

export interface InvoiceGroup {
  cardId: string;
  cardName: string;
  cardColor: string;
  invoiceMonth: string;
  transactions: TransactionWithDetails[];
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
}

/**
 * Calculate the invoice month for a credit card transaction
 * based on the due date and card closing day.
 */
export function getInvoiceMonth(dueDate: string, closingDay: number): string {
  const [year, month] = dueDate.split('-').map(Number);
  const day = parseInt(dueDate.split('-')[2], 10);

  let invoiceYear = year;
  let invoiceMonth = month;

  if (day > closingDay) {
    // Transaction goes to next month's invoice
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }

  return `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`;
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
 * @param invoicePayments - Map of "cardId-invoiceMonth" to total paid amount
 */
export function groupTransactionsByInvoice(
  transactions: TransactionWithDetails[],
  selectedMonth: string,
  groupCardTransactions: boolean,
  urgentFilter: boolean,
  invoicePayments?: Map<string, number>
): { accountTransactions: TransactionWithDetails[]; invoiceGroups: InvoiceGroup[] } {
  const accountTx: TransactionWithDetails[] = [];
  const cardTxMap = new Map<string, InvoiceGroup>();

  // Debug
  console.log('[groupTransactionsByInvoice] Input:', {
    totalTransactions: transactions.length,
    selectedMonth,
    groupCardTransactions,
    urgentFilter,
  });

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

  // Debug: Check for Gasolina transaction
  const gasolinaId = '62f32f4e-09fb-471d-bc82-8dbc990fc031';
  const gasolinaTx = transactions.find(t => t.id === gasolinaId);
  console.log('[groupTransactionsByInvoice] Gasolina in input:', gasolinaTx ? {
    id: gasolinaTx.id,
    desc: gasolinaTx.description,
    due_date: gasolinaTx.due_date,
    has_credit_card_id: !!gasolinaTx.credit_card_id,
    has_credit_card: !!gasolinaTx.credit_card,
    closing_day: gasolinaTx.credit_card?.closing_day,
  } : 'NOT FOUND');

  for (const tx of transactions) {
    if (tx.credit_card_id && tx.credit_card) {
      const invoiceMonth = getInvoiceMonth(tx.due_date, tx.credit_card.closing_day);

      // Debug: Specific check for Gasolina
      if (tx.id === gasolinaId) {
        console.log('[groupTransactionsByInvoice] Processing Gasolina:', {
          invoiceMonth,
          selectedMonth,
          matches: invoiceMonth === selectedMonth,
          groupCardTransactions,
        });
      }

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
          paidAmount: 0,
          remainingAmount: 0,
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

  // Determine status of each invoice and calculate paid/remaining amounts
  for (const group of cardTxMap.values()) {
    const key = `${group.cardId}-${group.invoiceMonth}`;
    const paidFromPayments = invoicePayments?.get(key) || 0;

    group.paidAmount = paidFromPayments;
    group.remainingAmount = Math.max(0, group.total - paidFromPayments);

    // Determine status based on payments
    if (group.total > 0 && group.remainingAmount === 0) {
      group.status = 'PAGO';
    } else if (paidFromPayments > 0) {
      group.status = 'PARCIAL';
    } else {
      // Fallback to checking individual transaction status
      const allPaid = group.transactions.every(tx => tx.status === 'PAGO');
      if (allPaid) {
        group.status = 'PAGO';
        group.paidAmount = group.total;
        group.remainingAmount = 0;
      } else {
        group.status = 'PENDENTE';
      }
    }
  }

  // Filter only invoices for the selected month with transactions and sort
  const allGroups = Array.from(cardTxMap.values());
  console.log('[groupTransactionsByInvoice] All invoice groups:', allGroups.map(g => ({
    cardName: g.cardName,
    invoiceMonth: g.invoiceMonth,
    txCount: g.transactions.length,
    matchesSelected: g.invoiceMonth === selectedMonth,
  })));

  const groups = allGroups
    .filter(g => g.invoiceMonth === selectedMonth && g.transactions.length > 0)
    .sort((a, b) => b.invoiceMonth.localeCompare(a.invoiceMonth));

  console.log('[groupTransactionsByInvoice] Final result:', {
    accountTransactions: accountTx.length,
    invoiceGroups: groups.length,
    totalCardTx: groups.reduce((sum, g) => sum + g.transactions.length, 0),
  });

  // Sort transactions by due date
  accountTx.sort((a, b) => a.due_date.localeCompare(b.due_date));

  return { accountTransactions: accountTx, invoiceGroups: groups };
}
