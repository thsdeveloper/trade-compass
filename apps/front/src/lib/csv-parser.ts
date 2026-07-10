import type { FuturesAsset, TradeDirection, DayTrade } from '@/types/daytrade';

export interface ParsedTrade {
  asset: FuturesAsset;
  direction: TradeDirection;
  contracts: number;
  entry_price: number;
  exit_price: number;
  entry_time: string; // ISO
  exit_time: string; // ISO
  mep: number;
  men: number;
  result: number;
}

/**
 * Converte numero em formato brasileiro (1.234,56) para number
 */
export function parseBrazilianNumber(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') {
    return 0;
  }
  // Remove espacos
  let cleaned = value.trim();
  // Remove pontos de milhar e troca virgula por ponto
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte data/hora em formato brasileiro (DD/MM/YYYY HH:mm:ss) para ISO string
 */
export function parseBrazilianDateTime(value: string): string {
  if (!value || value.trim() === '') {
    return new Date().toISOString();
  }
  // Formato: "14/01/2026 09:46:03"
  const [datePart, timePart] = value.trim().split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');

  const date = new Date(
    parseInt(year),
    parseInt(month) - 1, // Mes e 0-indexed
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds || '0')
  );

  return date.toISOString();
}

/**
 * Mapeia codigo do ativo para tipo FuturesAsset
 * WING26 -> WINFUT, WDOG26 -> WDOFUT, etc
 */
export function mapAsset(ativo: string): FuturesAsset {
  const normalized = ativo.toUpperCase().trim();
  if (normalized.startsWith('WIN')) {
    return 'WINFUT';
  }
  if (normalized.startsWith('WDO')) {
    return 'WDOFUT';
  }
  // Default para mini indice
  return 'WINFUT';
}

/**
 * Mapeia lado da operacao para TradeDirection
 */
export function mapDirection(lado: string): TradeDirection {
  const normalized = lado.toUpperCase().trim();
  if (normalized === 'C' || normalized === 'COMPRA') {
    return 'BUY';
  }
  return 'SELL';
}

/**
 * Encontra o indice da linha de cabecalho das colunas
 */
function findHeaderLineIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Ativo') && line.includes('Abertura') && line.includes('Fechamento')) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse do arquivo CSV completo
 */
export function parseCSV(content: string): ParsedTrade[] {
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  // Encontrar linha de cabecalho
  const headerIndex = findHeaderLineIndex(lines);
  if (headerIndex === -1) {
    throw new Error('Cabecalho do CSV nao encontrado');
  }

  // Colunas esperadas (separadas por ;)
  const headerLine = lines[headerIndex];
  const headers = headerLine.split(';').map((h) => h.trim());

  // Mapear indices das colunas
  const colIndex = {
    ativo: headers.findIndex((h) => h.toLowerCase().includes('ativo')),
    abertura: headers.findIndex((h) => h.toLowerCase().includes('abertura')),
    fechamento: headers.findIndex((h) => h.toLowerCase().includes('fechamento')),
    qtdCompra: headers.findIndex((h) => h.toLowerCase().includes('qtd compra')),
    qtdVenda: headers.findIndex((h) => h.toLowerCase().includes('qtd venda')),
    lado: headers.findIndex((h) => h.toLowerCase() === 'lado'),
    precoCompra: headers.findIndex((h) => h.toLowerCase().includes('compra') && h.toLowerCase().includes('pre')),
    precoVenda: headers.findIndex((h) => h.toLowerCase().includes('venda') && h.toLowerCase().includes('pre')),
    mep: headers.findIndex((h) => h.toLowerCase() === 'mep'),
    men: headers.findIndex((h) => h.toLowerCase() === 'men'),
    resultado: headers.findIndex((h) => h.toLowerCase().includes('res. opera')),
  };

  // Processar linhas de dados (apos o cabecalho)
  const trades: ParsedTrade[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split(';');

    // Verificar se tem dados suficientes
    if (cols.length < 10) continue;

    const ativo = cols[colIndex.ativo]?.trim() || '';
    const lado = cols[colIndex.lado]?.trim() || '';
    const qtdCompra = parseInt(cols[colIndex.qtdCompra]?.trim() || '0') || 0;
    const qtdVenda = parseInt(cols[colIndex.qtdVenda]?.trim() || '0') || 0;
    const precoCompra = parseBrazilianNumber(cols[colIndex.precoCompra] || '');
    const precoVenda = parseBrazilianNumber(cols[colIndex.precoVenda] || '');
    const abertura = cols[colIndex.abertura]?.trim() || '';
    const fechamento = cols[colIndex.fechamento]?.trim() || '';
    const mep = parseBrazilianNumber(cols[colIndex.mep] || '');
    const men = parseBrazilianNumber(cols[colIndex.men] || '');
    const resultado = parseBrazilianNumber(cols[colIndex.resultado] || '');

    // Validar dados minimos
    if (!ativo || !lado || !abertura || !fechamento) continue;

    const direction = mapDirection(lado);
    const contracts = qtdCompra || qtdVenda || 1;

    // Determinar preco de entrada e saida baseado no lado
    // Se COMPRA: entrada = preco compra, saida = preco venda
    // Se VENDA: entrada = preco venda, saida = preco compra
    const entry_price = direction === 'BUY' ? precoCompra : precoVenda;
    const exit_price = direction === 'BUY' ? precoVenda : precoCompra;

    trades.push({
      asset: mapAsset(ativo),
      direction,
      contracts,
      entry_price,
      exit_price,
      entry_time: parseBrazilianDateTime(abertura),
      exit_time: parseBrazilianDateTime(fechamento),
      mep: Math.abs(mep),
      men: Math.abs(men),
      result: resultado,
    });
  }

  return trades;
}

/**
 * Gera uma chave unica para identificar um trade
 * Baseada em: asset + direction + entry_time (ignorando segundos)
 * Isso permite matching mesmo quando o trade foi cadastrado manualmente sem segundos
 */
export function generateTradeKey(trade: ParsedTrade | DayTrade): string {
  const date = new Date(trade.entry_time);
  // Zerar segundos e milissegundos para comparacao flexivel
  date.setSeconds(0, 0);
  return `${trade.asset}-${trade.direction}-${date.getTime()}`;
}

export interface TradeMatchResult {
  trade: ParsedTrade;
  status: 'new' | 'update' | 'duplicate';
  existingTradeId?: string; // ID do trade existente para atualizar
}

/**
 * Analisa trades do CSV e identifica:
 * - new: trade completamente novo
 * - update: trade existe mas pode ser atualizado com dados mais precisos
 * - duplicate: trade ja existe com dados iguais ou mais completos
 */
export function analyzeTradesForImport(
  tradesToImport: ParsedTrade[],
  existingTrades: DayTrade[]
): TradeMatchResult[] {
  // Criar mapa com chaves dos trades existentes
  const existingByKey = new Map<string, DayTrade>();
  for (const trade of existingTrades) {
    const key = generateTradeKey(trade);
    existingByKey.set(key, trade);
  }

  const results: TradeMatchResult[] = [];

  for (const trade of tradesToImport) {
    const key = generateTradeKey(trade);
    const existing = existingByKey.get(key);

    if (!existing) {
      // Trade novo
      results.push({ trade, status: 'new' });
    } else {
      // Trade existe - verificar se vale atualizar
      // Atualizar se o CSV tem dados mais precisos (ex: timestamp com segundos, MEP/MEN)
      const csvHasMorePrecision =
        new Date(trade.entry_time).getSeconds() !== 0 ||
        new Date(trade.exit_time).getSeconds() !== 0;

      const existingMissingMepMen =
        (existing.mep === null && trade.mep > 0) ||
        (existing.men === null && trade.men > 0);

      if (csvHasMorePrecision || existingMissingMepMen) {
        results.push({
          trade,
          status: 'update',
          existingTradeId: existing.id
        });
      } else {
        results.push({
          trade,
          status: 'duplicate',
          existingTradeId: existing.id
        });
      }
    }
  }

  return results;
}
