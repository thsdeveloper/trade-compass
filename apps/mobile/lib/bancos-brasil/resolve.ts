/**
 * Resolve um identificador/nome de conta para a chave de banco suportada
 * pela lib de logos (ex.: "Banco do Brasil" → "bancodobrasil", "Itaú" → "itau").
 * Retorna null quando não há logo correspondente (o chamador cai no ícone genérico).
 */
import { listarBancos } from './core';

/** minúsculas, sem acento e só alfanumérico */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Apelidos comuns → chave da lib (chaves já normalizadas). */
const ALIASES: Record<string, string> = {
  bb: 'bancodobrasil',
  bancodobrasil: 'bancodobrasil',
  bancodobrasilsa: 'bancodobrasil',
  brasil: 'bancodobrasil',
  itau: 'itau',
  itauunibanco: 'itau',
  bancoitau: 'itau',
  itaucard: 'itau',
  caixa: 'caixa',
  caixaeconomica: 'caixa',
  caixaeconomicafederal: 'caixa',
  cef: 'caixa',
  nu: 'nubank',
  nubank: 'nubank',
  nuinvest: 'nubank',
  nupagamentos: 'nubank',
  bradesco: 'bradesco',
  bancobradesco: 'bradesco',
  santander: 'santander',
  bancosantander: 'santander',
  inter: 'inter',
  bancointer: 'inter',
  btg: 'btg',
  btgpactual: 'btg',
  xp: 'xp',
  xpinvestimentos: 'xp',
  c6: 'c6',
  c6bank: 'c6',
  picpay: 'picpay',
  mercadopago: 'mercadopago',
  mercpago: 'mercadopago',
  mp: 'mercadopago',
  pagbank: 'pagbank',
  pagseguro: 'pagbank',
  pagseguropagbank: 'pagbank',
  sicoob: 'sicoob',
  sicredi: 'sicredi',
  neon: 'neon',
  next: 'next',
  original: 'original',
  bancooriginal: 'original',
  safra: 'safra',
  bancosafra: 'safra',
  pan: 'pan',
  bancopan: 'pan',
  digio: 'digio',
  cora: 'cora',
  wise: 'wise',
  paypal: 'paypal',
  stripe: 'stripe',
  stone: 'stone',
  rico: 'rico',
  revolut: 'revolut',
  bs2: 'bs2',
  bv: 'bv',
  bancobv: 'bv',
  votorantim: 'bv',
  efibank: 'efibank',
  efi: 'efibank',
  gerencianet: 'efibank',
  ton: 'ton',
  iugu: 'iugu',
  asaas: 'asaas',
  ngcash: 'ngcash',
  avenue: 'avenue',
  nomad: 'nomad',
  mercantil: 'mercantil',
  bancomercantil: 'mercantil',
  bmg: 'bmg',
  bancobmg: 'bmg',
  agibank: 'agibank',
  infinitepay: 'infinitepay',
};

let keysCache: Set<string> | null = null;
function bankKeys(): Set<string> {
  if (!keysCache) keysCache = new Set(listarBancos().map(normalize));
  return keysCache;
}

function matchCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = normalize(raw);
  if (!n) return null;

  const keys = bankKeys();
  // 1) match exato com a chave da lib
  if (keys.has(n)) return n;
  // 2) apelido conhecido
  if (ALIASES[n]) return ALIASES[n];
  // 3) chave contida no texto (só chaves longas, p/ evitar falso-positivo)
  for (const key of keys) {
    if (key.length >= 5 && n.includes(key)) return key;
  }
  // 4) apelido longo contido no texto
  for (const alias of Object.keys(ALIASES)) {
    if (alias.length >= 5 && n.includes(alias)) return ALIASES[alias];
  }
  return null;
}

/**
 * Tenta resolver por `bank` (id/chave) primeiro; se falhar, pelo `name` da conta.
 */
export function resolveBankKey(
  bank?: string | null,
  name?: string | null,
): string | null {
  return matchCandidate(bank) ?? matchCandidate(name);
}
