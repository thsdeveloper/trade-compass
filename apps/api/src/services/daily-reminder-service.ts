import { resend, EMAIL_CONFIG } from '../lib/resend.js';
import { getLocalDateAndHour, addDays, isValidCalendarDate } from '../lib/local-time.js';
import { getInvoicePeriodForDueMonth } from '../domain/finance/invoice.js';
import {
  getReminderCandidates,
  getReminderBills,
  getActiveCreditCards,
  getCardTransactionsInWindow,
  getInvoicePaymentsForMonths,
  getUserEmail,
  markReminderSent,
  type ReminderCandidate,
  type ReminderBillRow,
  type ReminderCardRow,
} from '../data/finance/daily-reminder-repository.js';

/**
 * Lembrete diário de vencimentos: para cada usuário habilitado cuja hora local
 * já chegou (e que ainda não recebeu hoje), agrupa contas atrasadas + que vencem
 * amanhã (avulsas e faturas) num único e-mail via Resend.
 */

// Quantos meses para trás procurar faturas atrasadas ainda em aberto.
const LOOKBACK_MONTHS = 3;
// Quantos usuários processar em paralelo (evita rate limit do Resend / picos no DB).
const CONCURRENCY = 5;
const MAX_RETRIES = 3;

export interface ReminderItem {
  kind: 'bill' | 'invoice';
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  sourceName: string; // categoria (conta avulsa) ou nome do cartão (fatura)
}

export interface ReminderPayload {
  userId: string;
  to: string;
  localDate: string;
  overdue: ReminderItem[];
  dueTomorrow: ReminderItem[];
  overdueTotal: number;
  dueTomorrowTotal: number;
  grandTotal: number;
}

export interface DailyRunSummary {
  candidates: number;
  due: number;
  sent: number;
  skippedNoItems: number;
  failed: number;
}

type CandidateOutcome = 'sent' | 'skipped_no_items' | 'skipped_no_email' | 'failed';

/** Ponto de entrada da varredura horária. `now` é o instante da execução. */
export async function runDailyDueReminders(now: Date): Promise<DailyRunSummary> {
  const candidates = await getReminderCandidates();
  const summary: DailyRunSummary = {
    candidates: candidates.length,
    due: 0,
    sent: 0,
    skippedNoItems: 0,
    failed: 0,
  };

  // Filtra quem deve receber nesta hora: hora local >= hora escolhida e ainda
  // não processado hoje. Usar >= (não ==) recupera uma hora eventualmente perdida.
  const dueNow = candidates.filter((c) => {
    const { localDate, localHour } = getLocalDateAndHour(c.timezone, now);
    if (c.daily_email_last_sent_on === localDate) return false;
    return localHour >= c.daily_email_hour;
  });
  summary.due = dueNow.length;

  for (let i = 0; i < dueNow.length; i += CONCURRENCY) {
    const chunk = dueNow.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.all(chunk.map((c) => processCandidate(c, now)));
    for (const outcome of outcomes) {
      if (outcome === 'sent') summary.sent += 1;
      else if (outcome === 'skipped_no_items' || outcome === 'skipped_no_email')
        summary.skippedNoItems += 1;
      else summary.failed += 1;
    }
  }

  return summary;
}

async function processCandidate(
  candidate: ReminderCandidate,
  now: Date
): Promise<CandidateOutcome> {
  const { localDate } = getLocalDateAndHour(candidate.timezone, now);
  const localTomorrow = addDays(localDate, 1);

  try {
    const { overdue, dueTomorrow } = await collectItems(candidate.id, localDate, localTomorrow);

    if (overdue.length === 0 && dueTomorrow.length === 0) {
      // Nada a enviar: marca processado para não recomputar toda hora até amanhã.
      await markReminderSent(candidate.id, localDate);
      return 'skipped_no_items';
    }

    const to = await getUserEmail(candidate.id);
    if (!to) {
      console.warn(`Lembrete diário: usuário ${candidate.id} sem e-mail; pulando.`);
      await markReminderSent(candidate.id, localDate);
      return 'skipped_no_email';
    }

    const payload = buildPayload(candidate.id, to, localDate, overdue, dueTomorrow);
    const result = await sendDailyReminderEmail(payload);

    if (result.success) {
      await markReminderSent(candidate.id, localDate);
      return 'sent';
    }

    // Falha no envio: NÃO marca — retenta na próxima execução horária.
    console.error(`Lembrete diário: falha ao enviar para ${candidate.id}: ${result.error}`);
    return 'failed';
  } catch (err) {
    console.error(
      `Lembrete diário: erro ao processar ${candidate.id}:`,
      err instanceof Error ? err.message : err
    );
    return 'failed';
  }
}

async function collectItems(
  userId: string,
  localDate: string,
  localTomorrow: string
): Promise<{ overdue: ReminderItem[]; dueTomorrow: ReminderItem[] }> {
  const overdue: ReminderItem[] = [];
  const dueTomorrow: ReminderItem[] = [];

  // Contas avulsas (não-cartão)
  const bills = await getReminderBills(userId, localTomorrow);
  for (const bill of bills) {
    const item: ReminderItem = {
      kind: 'bill',
      description: billDescription(bill),
      amount: bill.amount,
      dueDate: bill.due_date,
      sourceName: bill.category?.name ?? 'Sem categoria',
    };
    if (bill.due_date === localTomorrow) dueTomorrow.push(item);
    else if (bill.due_date < localDate) overdue.push(item);
    // due_date === localDate (hoje) é descartado: escopo é atrasadas + amanhã.
  }

  // Faturas de cartão (derivadas por cartão)
  const cards = await getActiveCreditCards(userId);
  const perCard = await Promise.all(
    cards.map((card) => collectCardInvoices(userId, card, localDate, localTomorrow))
  );
  for (const bucketed of perCard) {
    overdue.push(...bucketed.overdue);
    dueTomorrow.push(...bucketed.dueTomorrow);
  }

  overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  dueTomorrow.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { overdue, dueTomorrow };
}

async function collectCardInvoices(
  userId: string,
  card: ReminderCardRow,
  localDate: string,
  localTomorrow: string
): Promise<{ overdue: ReminderItem[]; dueTomorrow: ReminderItem[] }> {
  const overdue: ReminderItem[] = [];
  const dueTomorrow: ReminderItem[] = [];

  // Faturas candidatas: vencimentos do período de lookback até amanhã, com o
  // bucket (atrasada/amanhã) já resolvido — só computamos o valor das que importam.
  const inScope = candidateDueMonths(localDate, localTomorrow)
    .map(({ year, month }) =>
      getInvoicePeriodForDueMonth(card.closing_day, card.due_day, year, month)
    )
    .filter((period) => isValidCalendarDate(period.dueDate))
    .map((period) => {
      const bucket: 'overdue' | 'dueTomorrow' | null =
        period.dueDate === localTomorrow
          ? 'dueTomorrow'
          : period.dueDate < localDate
            ? 'overdue'
            : null;
      return { ...period, bucket };
    })
    .filter(
      (period): period is typeof period & { bucket: 'overdue' | 'dueTomorrow' } =>
        period.bucket !== null
    );

  if (inScope.length === 0) return { overdue, dueTomorrow };

  // Um round-trip por cartão: janela-união das compras + todos os meses de pagamento.
  const windowStart = inScope.reduce(
    (min, p) => (p.periodStart < min ? p.periodStart : min),
    inScope[0].periodStart
  );
  const windowEnd = inScope.reduce(
    (max, p) => (p.periodEnd > max ? p.periodEnd : max),
    inScope[0].periodEnd
  );
  const invoiceMonths = [...new Set(inScope.map((p) => p.invoiceMonth))];

  const [txns, payments] = await Promise.all([
    getCardTransactionsInWindow(userId, card.id, windowStart, windowEnd),
    getInvoicePaymentsForMonths(userId, card.id, invoiceMonths),
  ]);

  for (const period of inScope) {
    const total = txns
      .filter((t) => t.due_date >= period.periodStart && t.due_date <= period.periodEnd)
      .reduce((sum, t) => sum + t.amount, 0);
    const paid = payments
      .filter((p) => p.invoice_month === period.invoiceMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0) continue;

    const item: ReminderItem = {
      kind: 'invoice',
      description: `Fatura ${card.name}`,
      amount: remaining,
      dueDate: period.dueDate,
      sourceName: card.name,
    };
    if (period.bucket === 'dueTomorrow') dueTomorrow.push(item);
    else overdue.push(item);
  }

  return { overdue, dueTomorrow };
}

/** Meses (ano+mês) de vencimento candidatos: [localDate - LOOKBACK .. localTomorrow]. */
function candidateDueMonths(
  localDate: string,
  localTomorrow: string
): { year: number; month: number }[] {
  const [ldY, ldM] = localDate.split('-').map(Number);
  let fromYear = ldY;
  let fromMonth = ldM - LOOKBACK_MONTHS;
  while (fromMonth < 1) {
    fromMonth += 12;
    fromYear -= 1;
  }

  const [toYear, toMonth] = localTomorrow.split('-').map(Number);

  const months: { year: number; month: number }[] = [];
  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function billDescription(bill: ReminderBillRow): string {
  if (bill.installment_number && bill.total_installments) {
    const suffix = `(${bill.installment_number}/${bill.total_installments})`;
    return bill.description.includes(suffix)
      ? bill.description
      : `${bill.description} ${suffix}`;
  }
  return bill.description;
}

function buildPayload(
  userId: string,
  to: string,
  localDate: string,
  overdue: ReminderItem[],
  dueTomorrow: ReminderItem[]
): ReminderPayload {
  const sum = (items: ReminderItem[]) => items.reduce((acc, i) => acc + i.amount, 0);
  const overdueTotal = sum(overdue);
  const dueTomorrowTotal = sum(dueTomorrow);
  return {
    userId,
    to,
    localDate,
    overdue,
    dueTomorrow,
    overdueTotal,
    dueTomorrowTotal,
    grandTotal: overdueTotal + dueTomorrowTotal,
  };
}

/** Envia o e-mail agrupado com retry/backoff e idempotência (X-Entity-Ref-ID). */
export async function sendDailyReminderEmail(
  payload: ReminderPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Servico de email nao configurado. Verifique a variavel RESEND_API_KEY.',
    };
  }

  const count = payload.overdue.length + payload.dueTomorrow.length;
  const subject = `Vencimentos - ${count} ${count === 1 ? 'conta' : 'contas'} - Money Compass`;
  const html = generateDailyReminderHTML(payload);
  const idempotencyKey = `daily-reminder-${payload.userId}-${payload.localDate}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        ...(EMAIL_CONFIG.replyTo && { replyTo: EMAIL_CONFIG.replyTo }),
        to: payload.to,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': idempotencyKey,
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry =
        lastError.message.includes('429') ||
        lastError.message.includes('5') ||
        lastError.message.toLowerCase().includes('rate limit') ||
        lastError.message.toLowerCase().includes('server error');

      if (shouldRetry && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`Envio do lembrete (tentativa ${attempt}) falhou, retry em ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  console.error('Falha ao enviar lembrete diário:', lastError);
  return { success: false, error: lastError?.message || 'Erro desconhecido ao enviar email' };
}

// ==================== Template HTML ====================

function generateDailyReminderHTML(payload: ReminderPayload): string {
  const overdueCount = payload.overdue.length;
  const tomorrowCount = payload.dueTomorrow.length;

  const intro =
    overdueCount > 0 && tomorrowCount > 0
      ? `Voce tem <strong>${overdueCount}</strong> conta(s) atrasada(s) e <strong>${tomorrowCount}</strong> que vence(m) amanha.`
      : overdueCount > 0
        ? `Voce tem <strong>${overdueCount}</strong> conta(s) atrasada(s).`
        : `Voce tem <strong>${tomorrowCount}</strong> conta(s) que vence(m) amanha.`;

  const sections =
    renderSection('Atrasadas', '#fee2e2', '#dc2626', payload.overdue, payload.overdueTotal) +
    renderSection('Vencem amanha', '#e0edff', '#0066ff', payload.dueTomorrow, payload.dueTomorrowTotal);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vencimentos - Money Compass</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 12px 12px 0 0; padding: 32px;">
          <tr>
            <td style="text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Money Compass</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Vencimentos do dia</p>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6;">
                ${intro} Confira abaixo para nao perder nenhum pagamento.
              </p>

              ${sections}

              <!-- Total -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="color: #94a3b8; font-size: 14px;">Total a pagar</td>
                  <td style="text-align: right; color: #ffffff; font-size: 18px; font-weight: 700;">${formatBRL(payload.grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 12px 12px; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                Voce recebe este e-mail porque ativou os lembretes diarios de vencimento no Money Compass.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Para desativar, acesse Configuracoes > Notificacoes no aplicativo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function renderSection(
  title: string,
  badgeBg: string,
  badgeFg: string,
  items: ReminderItem[],
  subtotal: number
): string {
  if (items.length === 0) return '';

  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 600;">${escapeHtml(item.description)}</p>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">${escapeHtml(item.sourceName)} &middot; vence ${formatDateBR(item.dueDate)}</p>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; vertical-align: top;">
        <p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 600;">${formatBRL(item.amount)}</p>
      </td>
    </tr>`
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
    <tr>
      <td colspan="2" style="padding-bottom: 8px;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background-color: ${badgeBg}; color: ${badgeFg}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${title}</span>
      </td>
    </tr>
    ${rows}
    <tr>
      <td style="padding: 12px 0 0; color: #64748b; font-size: 13px;">Subtotal</td>
      <td style="padding: 12px 0 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 700;">${formatBRL(subtotal)}</td>
    </tr>
  </table>`;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
