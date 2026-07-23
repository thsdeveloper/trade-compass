import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks do repositório e do Resend (hoisted para o factory de vi.mock).
const mocks = vi.hoisted(() => ({
  getReminderCandidates: vi.fn(),
  getReminderBills: vi.fn(),
  getActiveCreditCards: vi.fn(),
  getCardTransactionsInWindow: vi.fn(),
  getInvoicePaymentsForMonths: vi.fn(),
  getUserEmail: vi.fn(),
  markReminderSent: vi.fn(),
  send: vi.fn(),
}));

vi.mock('../src/data/finance/daily-reminder-repository.js', () => ({
  getReminderCandidates: mocks.getReminderCandidates,
  getReminderBills: mocks.getReminderBills,
  getActiveCreditCards: mocks.getActiveCreditCards,
  getCardTransactionsInWindow: mocks.getCardTransactionsInWindow,
  getInvoicePaymentsForMonths: mocks.getInvoicePaymentsForMonths,
  getUserEmail: mocks.getUserEmail,
  markReminderSent: mocks.markReminderSent,
}));

vi.mock('../src/lib/resend.js', () => ({
  resend: { emails: { send: mocks.send } },
  EMAIL_CONFIG: { from: 'Money Compass <test@resend.dev>', replyTo: undefined },
}));

import { runDailyDueReminders } from '../src/services/daily-reminder-service.js';

// 12:00Z = 09:00 em America/Sao_Paulo (UTC-3): dia local 2026-07-23, hora 9.
const NOW = new Date('2026-07-23T12:00:00Z');

function candidate(overrides = {}) {
  return {
    id: 'user-1',
    daily_email_hour: 6,
    timezone: 'America/Sao_Paulo',
    daily_email_last_sent_on: null,
    ...overrides,
  };
}

function bill(overrides = {}) {
  return {
    id: 'b1',
    description: 'Conta',
    amount: 100,
    due_date: '2026-07-24',
    installment_number: null,
    total_installments: null,
    category: { name: 'Servicos', icon: null, color: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getReminderBills.mockResolvedValue([]);
  mocks.getActiveCreditCards.mockResolvedValue([]);
  mocks.getCardTransactionsInWindow.mockResolvedValue([]);
  mocks.getInvoicePaymentsForMonths.mockResolvedValue([]);
  mocks.getUserEmail.mockResolvedValue('user@example.com');
  mocks.markReminderSent.mockResolvedValue(undefined);
  mocks.send.mockResolvedValue({ data: { id: 'email_1' }, error: null });
});

describe('runDailyDueReminders', () => {
  it('agrupa atrasadas + vencem amanha num unico e-mail e marca enviado', async () => {
    mocks.getReminderCandidates.mockResolvedValue([candidate()]);
    mocks.getReminderBills.mockResolvedValue([
      bill({ id: 'b1', description: 'Aluguel', amount: 1500, due_date: '2026-07-20' }), // atrasada
      bill({ id: 'b2', description: 'Internet', amount: 100, due_date: '2026-07-24' }), // amanha
    ]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary).toMatchObject({ candidates: 1, due: 1, sent: 1, skippedNoItems: 0, failed: 0 });
    // Busca com o limite superior em "amanha" (inclui atrasadas por não ter piso).
    expect(mocks.getReminderBills).toHaveBeenCalledWith('user-1', '2026-07-24');

    expect(mocks.send).toHaveBeenCalledTimes(1);
    const arg = mocks.send.mock.calls[0][0];
    expect(arg.to).toBe('user@example.com');
    expect(arg.subject).toContain('2 contas');
    expect(arg.headers['X-Entity-Ref-ID']).toBe('daily-reminder-user-1-2026-07-23');
    expect(arg.html).toContain('Atrasadas');
    expect(arg.html).toContain('Vencem amanha');
    expect(arg.html).toContain('Aluguel');
    expect(arg.html).toContain('Internet');

    expect(mocks.markReminderSent).toHaveBeenCalledWith('user-1', '2026-07-23');
  });

  it('nao envia de novo se ja foi enviado hoje (idempotencia por dia local)', async () => {
    mocks.getReminderCandidates.mockResolvedValue([
      candidate({ daily_email_last_sent_on: '2026-07-23' }),
    ]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary.due).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.markReminderSent).not.toHaveBeenCalled();
  });

  it('nao envia antes da hora escolhida', async () => {
    // Hora local 9; escolhida 23 -> ainda nao deu a hora.
    mocks.getReminderCandidates.mockResolvedValue([candidate({ daily_email_hour: 23 })]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary.due).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sem itens: nao envia, mas marca processado para nao recomputar', async () => {
    mocks.getReminderCandidates.mockResolvedValue([candidate()]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary).toMatchObject({ due: 1, sent: 0, skippedNoItems: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.markReminderSent).toHaveBeenCalledWith('user-1', '2026-07-23');
  });

  it('inclui fatura de cartao nao paga que vence amanha (1 round-trip por cartao)', async () => {
    mocks.getReminderCandidates.mockResolvedValue([candidate()]);
    // fecha dia 10, vence dia 24 -> fatura de julho/2026 vence 2026-07-24 (amanha)
    mocks.getActiveCreditCards.mockResolvedValue([
      { id: 'card-1', name: 'Nubank', closing_day: 10, due_day: 24 },
    ]);
    // compra dentro do periodo de julho (2026-06-11..2026-07-10)
    mocks.getCardTransactionsInWindow.mockResolvedValue([{ due_date: '2026-07-05', amount: 800 }]);
    mocks.getInvoicePaymentsForMonths.mockResolvedValue([]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary.sent).toBe(1);
    expect(mocks.getCardTransactionsInWindow).toHaveBeenCalledTimes(1);
    const arg = mocks.send.mock.calls[0][0];
    expect(arg.subject).toContain('1 conta');
    expect(arg.html).toContain('Fatura Nubank');
    expect(arg.html).toContain('Vencem amanha');
  });

  it('fatura totalmente paga (remaining 0) nao entra no e-mail', async () => {
    mocks.getReminderCandidates.mockResolvedValue([candidate()]);
    mocks.getActiveCreditCards.mockResolvedValue([
      { id: 'card-1', name: 'Nubank', closing_day: 10, due_day: 24 },
    ]);
    mocks.getCardTransactionsInWindow.mockResolvedValue([{ due_date: '2026-07-05', amount: 800 }]);
    // pagamento total da fatura de julho
    mocks.getInvoicePaymentsForMonths.mockResolvedValue([
      { invoice_month: '2026-07', amount: 800 },
    ]);

    const summary = await runDailyDueReminders(NOW);

    expect(summary).toMatchObject({ sent: 0, skippedNoItems: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('falha no envio nao marca como enviado (retenta na proxima hora)', async () => {
    mocks.getReminderCandidates.mockResolvedValue([candidate()]);
    mocks.getReminderBills.mockResolvedValue([bill({ due_date: '2026-07-24' })]);
    mocks.send.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const summary = await runDailyDueReminders(NOW);

    expect(summary.failed).toBe(1);
    expect(summary.sent).toBe(0);
    expect(mocks.markReminderSent).not.toHaveBeenCalled();
  });
});
