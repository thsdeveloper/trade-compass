import type { StatementLineKind } from './statement-import-service.js';

/**
 * Matching deterministico de transferencias entre extratos importados em lote.
 *
 * Quando o usuario importa extratos de duas contas que transferem entre si,
 * a mesma transferencia aparece como DESPESA num extrato e RECEITA no outro.
 * Este service casa essas pernas por valor + janela de datas, usando os sinais
 * da IA (line_kind, conta contraparte sugerida) como bonus de confianca.
 * Nao ha chamada de LLM aqui: funcao pura e testavel.
 *
 * IMPORTANTE: um par so e formado quando a IA identificou pelo menos uma das
 * pernas como transferencia entre contas do MESMO titular (line_kind
 * TRANSFERENCIA_INTERNA ou conta contraparte sugerida). Valor igual + data
 * proxima sozinhos NAO bastam: PIX para terceiros e coincidencias de valor
 * nao devem virar transferencia automatica — isso desajustava os saldos.
 */

export interface MatchTransactionInput {
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  due_date: string; // YYYY-MM-DD
  line_kind: StatementLineKind;
  suggested_transfer_account_id: string | null;
  possible_duplicate: boolean;
}

export interface MatchStatementInput {
  account_id: string;
  transactions: MatchTransactionInput[];
}

/** Referencia a uma transacao dentro do lote: indice do extrato + indice da linha */
export interface TransferPairRef {
  statement_index: number;
  tx_index: number;
}

export interface MatchedTransferPair {
  /** Perna DESPESA (conta de origem do dinheiro) */
  out: TransferPairRef;
  /** Perna RECEITA (conta de destino do dinheiro) */
  in: TransferPairRef;
  score: number;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface MatchTransfersResult {
  pairs: MatchedTransferPair[];
  /** Duplicatas dentro do proprio lote (mesmo arquivo subido 2x, periodos sobrepostos) */
  intra_batch_duplicates: TransferPairRef[];
}

/** Janela maxima entre as datas das duas pernas de uma transferencia */
const DATE_WINDOW_DAYS = 3;
/** Tolerancia de centavos na comparacao de valores */
const AMOUNT_EPS = 0.005;
/** Score minimo para formar par (alem do sinal obrigatorio de transferencia interna) */
const MIN_SCORE = 3;
/** Score a partir do qual o par e considerado de alta confianca */
const HIGH_CONFIDENCE_SCORE = 6;

const TRANSFER_DESCRIPTION_REGEX = /\b(pix|ted|doc|transf)/i;

interface Candidate extends TransferPairRef {
  tx: MatchTransactionInput;
  account_id: string;
}

interface Edge {
  out: Candidate;
  in: Candidate;
  score: number;
  dateDiff: number;
}

function dayDiff(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.abs(Math.round((da - db) / 86_400_000));
}

function scoreEdge(out: Candidate, inn: Candidate, dateDiff: number): number {
  let score = 0;

  // Proximidade de datas
  if (dateDiff === 0) score += 3;
  else if (dateDiff === 1) score += 2;
  else score += 1;

  // A IA classificou a linha como transferencia interna
  if (out.tx.line_kind === 'TRANSFERENCIA_INTERNA') score += 2;
  if (inn.tx.line_kind === 'TRANSFERENCIA_INTERNA') score += 2;

  // A IA sugeriu exatamente a conta da outra perna como contraparte
  if (out.tx.suggested_transfer_account_id === inn.account_id) score += 2;
  if (inn.tx.suggested_transfer_account_id === out.account_id) score += 2;

  // Descricao com cara de transferencia (PIX/TED/DOC/transf)
  if (TRANSFER_DESCRIPTION_REGEX.test(out.tx.description)) score += 1;
  if (TRANSFER_DESCRIPTION_REGEX.test(inn.tx.description)) score += 1;

  return score;
}

function compareRefs(a: TransferPairRef, b: TransferPairRef): number {
  return a.statement_index - b.statement_index || a.tx_index - b.tx_index;
}

/**
 * Casa pernas DESPESA/RECEITA de transferencias entre extratos do lote.
 * Deterministico: mesma entrada produz sempre a mesma saida.
 */
export function matchTransfers(statements: MatchStatementInput[]): MatchTransfersResult {
  const outs: Candidate[] = [];
  const ins: Candidate[] = [];

  statements.forEach((statement, statementIndex) => {
    statement.transactions.forEach((tx, txIndex) => {
      // Pagamento de fatura nunca e perna de transferencia entre contas
      if (tx.line_kind === 'PAGAMENTO_FATURA') return;
      const candidate: Candidate = {
        statement_index: statementIndex,
        tx_index: txIndex,
        tx,
        account_id: statement.account_id,
      };
      if (tx.type === 'DESPESA') outs.push(candidate);
      else ins.push(candidate);
    });
  });

  // Gerar todas as arestas viaveis (valor igual, contas/extratos diferentes, janela de datas)
  const edges: Edge[] = [];
  for (const out of outs) {
    for (const inn of ins) {
      if (out.statement_index === inn.statement_index) continue;
      if (out.account_id === inn.account_id) continue;
      if (Math.abs(out.tx.amount - inn.tx.amount) >= AMOUNT_EPS) continue;
      const dateDiff = dayDiff(out.tx.due_date, inn.tx.due_date);
      if (dateDiff > DATE_WINDOW_DAYS) continue;

      // Sinal obrigatorio: a IA identificou pelo menos uma perna como
      // transferencia entre contas do proprio titular. Sem isso, valor igual
      // + data proxima e tratado como coincidencia (ex: PIX para terceiros).
      const hasInternalSignal =
        out.tx.line_kind === 'TRANSFERENCIA_INTERNA' ||
        inn.tx.line_kind === 'TRANSFERENCIA_INTERNA' ||
        out.tx.suggested_transfer_account_id === inn.account_id ||
        inn.tx.suggested_transfer_account_id === out.account_id;
      if (!hasInternalSignal) continue;

      const score = scoreEdge(out, inn, dateDiff);
      if (score < MIN_SCORE) continue;
      edges.push({ out, in: inn, score, dateDiff });
    }
  }

  // Atribuicao gulosa deterministica: melhor score primeiro, desempate estavel por indices
  edges.sort(
    (a, b) =>
      b.score - a.score ||
      a.dateDiff - b.dateDiff ||
      compareRefs(a.out, b.out) ||
      compareRefs(a.in, b.in)
  );

  const usedOuts = new Set<string>();
  const usedIns = new Set<string>();
  const refKey = (ref: TransferPairRef) => `${ref.statement_index}:${ref.tx_index}`;

  const pairs: MatchedTransferPair[] = [];
  for (const edge of edges) {
    const outKey = refKey(edge.out);
    const inKey = refKey(edge.in);
    if (usedOuts.has(outKey) || usedIns.has(inKey)) continue;
    usedOuts.add(outKey);
    usedIns.add(inKey);
    pairs.push({
      out: { statement_index: edge.out.statement_index, tx_index: edge.out.tx_index },
      in: { statement_index: edge.in.statement_index, tx_index: edge.in.tx_index },
      score: edge.score,
      confidence: edge.score >= HIGH_CONFIDENCE_SCORE ? 'HIGH' : 'MEDIUM',
    });
  }
  pairs.sort((a, b) => compareRefs(a.out, b.out));

  // Duplicatas intra-lote: mesma conta + type + valor + data vindas de EXTRATOS diferentes
  // (mesmo arquivo subido 2x ou periodos sobrepostos). Dentro do mesmo extrato nao marcamos:
  // duas compras reais identicas no mesmo dia sao legitimas.
  const groups = new Map<string, Candidate[]>();
  statements.forEach((statement, statementIndex) => {
    statement.transactions.forEach((tx, txIndex) => {
      const key = `${statement.account_id}|${tx.type}|${tx.amount.toFixed(2)}|${tx.due_date}`;
      const list = groups.get(key) ?? [];
      list.push({ statement_index: statementIndex, tx_index: txIndex, tx, account_id: statement.account_id });
      groups.set(key, list);
    });
  });

  const intraBatchDuplicates: TransferPairRef[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort(compareRefs);
    const firstStatement = list[0].statement_index;
    for (let i = 1; i < list.length; i++) {
      if (list[i].statement_index !== firstStatement) {
        intraBatchDuplicates.push({
          statement_index: list[i].statement_index,
          tx_index: list[i].tx_index,
        });
      }
    }
  }
  intraBatchDuplicates.sort(compareRefs);

  return { pairs, intra_batch_duplicates: intraBatchDuplicates };
}
