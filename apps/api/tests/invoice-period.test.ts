import { describe, it, expect } from 'vitest';
import { getInvoicePeriodForDueMonth } from '../src/domain/finance/invoice.js';

describe('getInvoicePeriodForDueMonth', () => {
  it('due_day > closing_day: fatura fecha no proprio mes de vencimento', () => {
    // fecha dia 10, vence dia 20 de marco/2026
    expect(getInvoicePeriodForDueMonth(10, 20, 2026, 3)).toEqual({
      invoiceMonth: '2026-03',
      periodStart: '2026-02-11',
      periodEnd: '2026-03-10',
      dueDate: '2026-03-20',
    });
  });

  it('due_day <= closing_day: fatura fecha no mes anterior', () => {
    // fecha dia 25, vence dia 10 de marco/2026 -> competencia fev/2026
    expect(getInvoicePeriodForDueMonth(25, 10, 2026, 3)).toEqual({
      invoiceMonth: '2026-02',
      periodStart: '2026-01-26',
      periodEnd: '2026-02-25',
      dueDate: '2026-03-10',
    });
  });

  it('vira o ano quando a competencia cai em dezembro anterior', () => {
    // vence dia 10 de janeiro/2026, fecha dia 25 -> competencia dez/2025
    expect(getInvoicePeriodForDueMonth(25, 10, 2026, 1)).toEqual({
      invoiceMonth: '2025-12',
      periodStart: '2025-11-26',
      periodEnd: '2025-12-25',
      dueDate: '2026-01-10',
    });
  });

  it('limita due_day ao ultimo dia do mes (fevereiro nao-bissexto)', () => {
    // due_day 31 em fevereiro/2026 (28 dias) -> vencimento 28
    const period = getInvoicePeriodForDueMonth(5, 31, 2026, 2);
    expect(period.dueDate).toBe('2026-02-28');
    expect(period.invoiceMonth).toBe('2026-02');
    expect(period.periodStart).toBe('2026-01-06');
    expect(period.periodEnd).toBe('2026-02-05');
  });

  it('normaliza overflow de closing_day+1 para o mes seguinte', () => {
    // fecha dia 31 -> periodo comeca em 32/fev, que normaliza para 04/mar
    expect(getInvoicePeriodForDueMonth(31, 15, 2026, 4)).toEqual({
      invoiceMonth: '2026-03',
      periodStart: '2026-03-04',
      periodEnd: '2026-03-31',
      dueDate: '2026-04-15',
    });
  });

  it('caso comum (due_day <= 28) mantem o dia exato do vencimento', () => {
    expect(getInvoicePeriodForDueMonth(15, 5, 2026, 7).dueDate).toBe('2026-07-05');
  });
});
