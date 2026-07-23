/**
 * Derivação do período e do vencimento de uma fatura de cartão.
 *
 * Uma fatura não é armazenada: é derivada de closing_day/due_day do cartão mais
 * as transações do período e os pagamentos (finance_invoice_payments). Esta é a
 * ÚNICA fonte de verdade do cálculo de período/vencimento — usada tanto pelo
 * dashboard (getUpcomingPaymentsByMonth) quanto pelo cron de lembretes diários.
 *
 * Convenção (mesma da tela de fatura): a fatura "que vence no mês X" fecha no
 * closing_day de X e vence no due_day de X — ou fecha no mês anterior quando o
 * vencimento é antes ou igual ao fechamento (due_day <= closing_day).
 */

export interface InvoicePeriod {
  /** Mês de competência da fatura (YYYY-MM), chave de finance_invoice_payments.invoice_month. */
  invoiceMonth: string;
  /** Início do período de compras (YYYY-MM-DD), inclusive. */
  periodStart: string;
  /** Fim do período de compras (YYYY-MM-DD), inclusive. */
  periodEnd: string;
  /** Data de vencimento da fatura (YYYY-MM-DD). */
  dueDate: string;
}

/**
 * @param closingDay dia de fechamento do cartão (1-31)
 * @param dueDay     dia de vencimento do cartão (1-31)
 * @param dueYear    ano em que a fatura vence
 * @param dueMonth   mês (1-12) em que a fatura vence
 */
export function getInvoicePeriodForDueMonth(
  closingDay: number,
  dueDay: number,
  dueYear: number,
  dueMonth: number
): InvoicePeriod {
  let invoiceYear = dueYear;
  let invoiceMonth = dueMonth;
  if (dueDay <= closingDay) {
    invoiceMonth -= 1;
    if (invoiceMonth < 1) {
      invoiceMonth = 12;
      invoiceYear -= 1;
    }
  }

  const invoiceMonthStr = `${invoiceYear}-${pad(invoiceMonth)}`;
  // new Date(y, mIndex, day) normaliza overflow de dia/mês (ex.: closing_day+1 = 32
  // rola para o mês seguinte) — comportamento preservado do dashboard.
  const periodStart = formatDate(new Date(invoiceYear, invoiceMonth - 2, closingDay + 1));
  const periodEnd = formatDate(new Date(invoiceYear, invoiceMonth - 1, closingDay));

  // Vencimento no mês pedido. due_day é limitado ao último dia do mês para não
  // gerar datas inválidas (ex.: due_day 31 em fevereiro) — no caso comum
  // (due_day <= 28) o resultado é idêntico ao formato anterior.
  const lastDay = new Date(dueYear, dueMonth, 0).getDate();
  const clampedDueDay = Math.min(dueDay, lastDay);
  const dueDate = `${dueYear}-${pad(dueMonth)}-${pad(clampedDueDay)}`;

  return { invoiceMonth: invoiceMonthStr, periodStart, periodEnd, dueDate };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
