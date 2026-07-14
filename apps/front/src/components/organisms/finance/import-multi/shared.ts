import type {
  AccountWithBank,
  DetectedDocumentKind,
  ImportPreviewTransaction,
  StatementFileKind,
  StatementLineKind,
} from '@/types/finance';

// Tipos e helpers compartilhados pelo fluxo de importação de múltiplos extratos

export type FileEntryStatus = 'detecting' | 'detected' | 'error';

export interface MultiReviewRow extends ImportPreviewTransaction {
  selected: boolean;
  /** Classificação editável (a IA sugere, o usuário pode corrigir) */
  kind: StatementLineKind;
  /** Conta contraparte para transferências internas não-pareadas */
  transferAccountId: string | null;
  /** Se != null, a linha está representada na seção de pares de transferência */
  pairId: string | null;
  /** Duplicata dentro do próprio lote (mesmo arquivo 2x / períodos sobrepostos) */
  intraBatchDuplicate: boolean;
  /** Chave pré-computada para agrupar transações semelhantes (null = descrição genérica demais) */
  simKey: string | null;
  /** O usuário editou o tipo manualmente (não sobrescrever via propagação) */
  kindEdited?: boolean;
  /** O usuário editou a categoria manualmente (não sobrescrever via propagação) */
  categoryEdited?: boolean;
}

export interface ImportFileEntry {
  id: string;
  file: File;
  kind: StatementFileKind;
  status: FileEntryStatus;
  documentKind: DetectedDocumentKind | null;
  accountId: string | null;
  detectedBankName: string | null;
  error: string | null;
  rows: MultiReviewRow[];
}

export interface RowRef {
  fileId: string;
  rowIndex: number;
}

export interface ReviewPair {
  id: string;
  /** Perna DESPESA (conta origem) */
  outRef: RowRef;
  /** Perna RECEITA (conta destino) */
  inRef: RowRef;
  selected: boolean;
  categoryId: string | null;
  confidence: 'HIGH' | 'MEDIUM';
}

export const KIND_LABELS: Record<StatementLineKind, string> = {
  NORMAL: 'Normal',
  TRANSFERENCIA_INTERNA: 'Transferência',
  PAGAMENTO_FATURA: 'Pgto fatura',
};

export const MAX_FILES = 6;
export const PARSE_CONCURRENCY = 3;

/** Executa workers com limite de concorrência preservando a ordem dos resultados */
export async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function runner() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runner())
  );
  return results;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Fallback quando a IA não identifica: tenta casar o nome do arquivo com conta/banco */
export function guessAccountFromFilename(
  filename: string,
  accounts: AccountWithBank[]
): string | null {
  const normalized = normalizeText(filename);
  for (const account of accounts) {
    const names = [account.name, account.bank?.name].filter(Boolean) as string[];
    for (const name of names) {
      const normalizedName = normalizeText(name);
      if (normalizedName.length >= 3 && normalized.includes(normalizedName)) {
        return account.id;
      }
    }
  }
  return null;
}

/**
 * Chave de similaridade entre transações: tipo + descrição normalizada sem
 * números/pontuação (datas, IDs de PIX etc. variam entre ocorrências da mesma
 * origem). Retorna null quando a descrição fica genérica demais para agrupar.
 */
export function similarityKeyFor(
  type: 'RECEITA' | 'DESPESA',
  description: string
): string | null {
  const normalized = normalizeText(description)
    .replace(/[0-9]/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length < 4) return null;
  return `${type}|${normalized}`;
}
