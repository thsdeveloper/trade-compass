/**
 * Utilitários de data/hora local a partir de um fuso IANA, sem depender do TZ do
 * processo (a máquina da Fly roda efetivamente em UTC). Toda a base financeira
 * trabalha com datas YYYY-MM-DD "sem timezone", então aqui também derivamos
 * strings de data em vez de objetos Date com hora.
 */

const FALLBACK_TIMEZONE = 'America/Sao_Paulo';

/**
 * Data (YYYY-MM-DD) e hora (0-23) locais no fuso informado para o instante `now`.
 * Se o fuso for inválido, cai para America/Sao_Paulo.
 */
export function getLocalDateAndHour(
  timeZone: string,
  now: Date
): { localDate: string; localHour: number } {
  const parts = formatParts(timeZone, now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  // Alguns builds do ICU emitem "24" para meia-noite com hour12:false.
  let hour = parseInt(get('hour'), 10);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;

  return { localDate: `${year}-${month}-${day}`, localHour: hour };
}

function formatParts(timeZone: string, now: Date): Intl.DateTimeFormatPart[] {
  try {
    return buildFormatter(timeZone).formatToParts(now);
  } catch {
    return buildFormatter(FALLBACK_TIMEZONE).formatToParts(now);
  }
}

function buildFormatter(timeZone: string): Intl.DateTimeFormat {
  // 'en-CA' formata a data como YYYY-MM-DD, já no formato que usamos.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
}

/**
 * Soma `n` dias (pode ser negativo) a uma data YYYY-MM-DD, retornando outra
 * string YYYY-MM-DD. Usa aritmética em UTC para não sofrer com DST/offset.
 */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Verifica se a string é uma data de calendário válida (ex.: rejeita 2026-02-31). */
export function isValidCalendarDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
