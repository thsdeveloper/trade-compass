/**
 * Parser determinístico de OFX (Open Financial Exchange), o formato de
 * extrato exportado pelos bancos brasileiros. Tolerante às duas variantes:
 * SGML (OFX 1.x, tags sem fechamento nos elementos-folha) e XML (OFX 2.x).
 *
 * Valores, datas, sinais e FITIDs saem daqui sem passar pela IA — a IA fica
 * responsável apenas por limpar descrições e categorizar (ver
 * statement-import-service).
 */

export interface OfxTransaction {
  /** Id único da transação no banco de origem (base da deduplicação exata) */
  fitid: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** Valor absoluto */
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  /** Texto bruto do banco (MEMO/NAME) — a IA limpa depois */
  memo: string;
}

export interface OfxStatement {
  /** STMTRS = extrato de conta; CCSTMTRS = fatura de cartão */
  kind: 'account' | 'credit_card' | null;
  bankId: string | null;
  accountId: string | null;
  org: string | null;
  transactions: OfxTransaction[];
}

/** Heurística barata para decidir se um arquivo texto é OFX */
export function isOfxContent(content: string): boolean {
  const head = content.slice(0, 2000);
  return /OFXHEADER|<OFX>/i.test(head);
}

/** Extrai o valor de um elemento-folha (SGML: sem tag de fechamento) */
function tagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  const value = match?.[1]?.trim();
  return value ? value : null;
}

/**
 * Converte o valor monetário do OFX. O spec manda ponto decimal, mas bancos
 * brasileiros às vezes exportam vírgula ("1.234,56" ou "-123,45").
 */
function parseOfxAmount(raw: string): number | null {
  let normalized = raw.replace(/\s/g, '');
  if (normalized.includes(',')) {
    // Vírgula presente = vírgula é o separador decimal; pontos são milhar
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/** DTPOSTED vem como YYYYMMDD[HHMMSS[.XXX]][gmt offset] */
function parseOfxDate(raw: string): string | null {
  const digits = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!digits) return null;
  const [, year, month, day] = digits;
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

export function parseOfx(content: string): OfxStatement | null {
  if (!isOfxContent(content)) return null;

  const transactions: OfxTransaction[] = [];
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  for (const block of blocks) {
    const rawAmount = tagValue(block, 'TRNAMT');
    const rawDate = tagValue(block, 'DTPOSTED');
    if (!rawAmount || !rawDate) continue;

    const amount = parseOfxAmount(rawAmount);
    const date = parseOfxDate(rawDate);
    if (amount === null || amount === 0 || !date) continue;

    // MEMO costuma ter o detalhe; NAME o favorecido. Junta os dois quando
    // são complementares.
    const memoTag = tagValue(block, 'MEMO');
    const nameTag = tagValue(block, 'NAME');
    let memo = memoTag ?? nameTag ?? '';
    if (memoTag && nameTag && !memoTag.toLowerCase().includes(nameTag.toLowerCase())) {
      memo = `${nameTag} - ${memoTag}`;
    }

    // Sinal do valor decide o tipo (TRNTYPE dos bancos é inconsistente)
    transactions.push({
      fitid: tagValue(block, 'FITID'),
      date,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      type: amount < 0 ? 'DESPESA' : 'RECEITA',
      memo,
    });
  }

  const kind = /<CCSTMTRS>/i.test(content)
    ? 'credit_card'
    : /<STMTRS>/i.test(content)
      ? 'account'
      : null;

  return {
    kind,
    bankId: tagValue(content, 'BANKID'),
    accountId: tagValue(content, 'ACCTID'),
    org: tagValue(content, 'ORG'),
    transactions,
  };
}
