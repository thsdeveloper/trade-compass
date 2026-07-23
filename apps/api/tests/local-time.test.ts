import { describe, it, expect } from 'vitest';
import {
  getLocalDateAndHour,
  addDays,
  isValidCalendarDate,
} from '../src/lib/local-time.js';

describe('getLocalDateAndHour', () => {
  it('converte para America/Sao_Paulo (UTC-3)', () => {
    const now = new Date('2026-07-23T10:30:00Z');
    expect(getLocalDateAndHour('America/Sao_Paulo', now)).toEqual({
      localDate: '2026-07-23',
      localHour: 7,
    });
  });

  it('converte para America/Manaus (UTC-4)', () => {
    const now = new Date('2026-07-23T10:30:00Z');
    expect(getLocalDateAndHour('America/Manaus', now)).toEqual({
      localDate: '2026-07-23',
      localHour: 6,
    });
  });

  it('vira o dia para tras perto da meia-noite local', () => {
    // 02:30Z = 23:30 do dia anterior em Sao Paulo
    const now = new Date('2026-07-23T02:30:00Z');
    expect(getLocalDateAndHour('America/Sao_Paulo', now)).toEqual({
      localDate: '2026-07-22',
      localHour: 23,
    });
  });

  it('meia-noite local vira hora 0 (nao 24)', () => {
    // 03:00Z = 00:00 em Sao Paulo
    const now = new Date('2026-07-23T03:00:00Z');
    expect(getLocalDateAndHour('America/Sao_Paulo', now)).toEqual({
      localDate: '2026-07-23',
      localHour: 0,
    });
  });

  it('fuso invalido cai para America/Sao_Paulo', () => {
    const now = new Date('2026-07-23T10:30:00Z');
    expect(getLocalDateAndHour('Fuso/Invalido', now)).toEqual(
      getLocalDateAndHour('America/Sao_Paulo', now)
    );
  });
});

describe('addDays', () => {
  it('soma um dia', () => {
    expect(addDays('2026-07-23', 1)).toBe('2026-07-24');
  });

  it('atravessa fronteira de mes (fev nao-bissexto)', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('atravessa fronteira de ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('subtrai dias', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('isValidCalendarDate', () => {
  it('rejeita datas de calendario inexistentes', () => {
    expect(isValidCalendarDate('2026-02-31')).toBe(false);
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
  });

  it('aceita datas validas', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
    expect(isValidCalendarDate('2026-07-23')).toBe(true);
  });
});
