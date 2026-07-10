'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Unlink,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/finance-api';
import {
  ACCEPT,
  MAX_FILE_SIZE,
  getFileKind,
  readStatementContent,
  formatStatementDate,
} from '@/lib/statement-file-utils';
import { toast } from '@/lib/toast';
import type {
  AccountWithBank,
  FinanceCategory,
  ConfirmImportItem,
  ConfirmMatchedTransfer,
  ConfirmMultiGroup,
  DetectedDocumentKind,
  ImportPreviewTransaction,
  MatchStatementInput,
  StatementFileKind,
  StatementLineKind,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface ImportMultiStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithBank[];
  categories: FinanceCategory[];
  onImported: () => void;
}

type FileEntryStatus = 'detecting' | 'detected' | 'error';

interface MultiReviewRow extends ImportPreviewTransaction {
  selected: boolean;
  /** Classificação editável (a IA sugere, o usuário pode corrigir) */
  kind: StatementLineKind;
  /** Conta contraparte para transferências internas não-pareadas */
  transferAccountId: string | null;
  /** Se != null, a linha está representada na seção de pares de transferência */
  pairId: string | null;
  /** Duplicata dentro do próprio lote (mesmo arquivo 2x / períodos sobrepostos) */
  intraBatchDuplicate: boolean;
}

interface ImportFileEntry {
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

interface RowRef {
  fileId: string;
  rowIndex: number;
}

interface ReviewPair {
  id: string;
  /** Perna DESPESA (conta origem) */
  outRef: RowRef;
  /** Perna RECEITA (conta destino) */
  inRef: RowRef;
  selected: boolean;
  categoryId: string | null;
  confidence: 'HIGH' | 'MEDIUM';
}

const KIND_LABELS: Record<StatementLineKind, string> = {
  NORMAL: 'Normal',
  TRANSFERENCIA_INTERNA: 'Transferência',
  PAGAMENTO_FATURA: 'Pgto fatura',
};

const MAX_FILES = 6;
const PARSE_CONCURRENCY = 3;

/** Executa workers com limite de concorrência preservando a ordem dos resultados */
async function runWithConcurrency<T, R>(
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

/** Fallback quando a IA não identifica: tenta casar o nome do arquivo com conta/banco */
function guessAccountFromFilename(filename: string, accounts: AccountWithBank[]): string | null {
  const normalized = filename
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (const account of accounts) {
    const names = [account.name, account.bank?.name].filter(Boolean) as string[];
    for (const name of names) {
      const normalizedName = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
      if (normalizedName.length >= 3 && normalized.includes(normalizedName)) {
        return account.id;
      }
    }
  }
  return null;
}

export function ImportMultiStatementDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onImported,
}: ImportMultiStatementDialogProps) {
  const { session } = useAuth();

  const [step, setStep] = useState<'files' | 'review'>('files');
  const [entries, setEntries] = useState<ImportFileEntry[]>([]);
  const [pairs, setPairs] = useState<ReviewPair[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const accountName = (id: string | null) =>
    activeAccounts.find((a) => a.id === id)?.name || 'Conta';

  // ===== Derivados do passo files =====
  const invoiceEntries = useMemo(
    () => entries.filter((e) => e.documentKind === 'CREDIT_CARD_INVOICE'),
    [entries]
  );
  const detecting = useMemo(() => entries.some((e) => e.status === 'detecting'), [entries]);
  const canAnalyze =
    entries.length > 0 &&
    !detecting &&
    invoiceEntries.length === 0 &&
    entries.every((e) => e.accountId);

  // ===== Derivados do passo review =====
  const getRow = (ref: RowRef): MultiReviewRow | null => {
    const entry = entries.find((e) => e.id === ref.fileId);
    return entry?.rows[ref.rowIndex] ?? null;
  };

  const selectedPairs = useMemo(() => pairs.filter((p) => p.selected), [pairs]);
  const unpairedSelectedRows = useMemo(
    () =>
      entries.flatMap((entry) =>
        entry.rows.filter((row) => row.selected && !row.pairId)
      ),
    [entries]
  );
  const totalSelected = unpairedSelectedRows.length + selectedPairs.length;
  const totals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const row of unpairedSelectedRows) {
      if (row.kind === 'TRANSFERENCIA_INTERNA') continue;
      if (row.type === 'RECEITA') receitas += row.amount;
      else despesas += row.amount;
    }
    return { receitas, despesas };
  }, [unpairedSelectedRows]);
  const duplicateCount = useMemo(
    () =>
      entries.reduce(
        (sum, entry) =>
          sum +
          entry.rows.filter((r) => r.possible_duplicate || r.intraBatchDuplicate).length,
        0
      ),
    [entries]
  );
  const missingCategoryCount =
    unpairedSelectedRows.filter((r) => !r.category_id).length +
    selectedPairs.filter((p) => !p.categoryId).length;
  const missingTransferAccountCount = unpairedSelectedRows.filter(
    (r) => r.kind === 'TRANSFERENCIA_INTERNA' && !r.transferAccountId
  ).length;

  const resetState = () => {
    setStep('files');
    setEntries([]);
    setPairs([]);
    setAnalyzing(false);
    setImporting(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  const updateEntry = (id: string, updates: Partial<ImportFileEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const updateRowByRef = (ref: RowRef, updates: Partial<MultiReviewRow>) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === ref.fileId
          ? {
              ...entry,
              rows: entry.rows.map((row, i) =>
                i === ref.rowIndex ? { ...row, ...updates } : row
              ),
            }
          : entry
      )
    );
  };

  // ===== Passo files: seleção + detecção =====

  const detectEntry = async (entry: ImportFileEntry) => {
    if (!session?.access_token) return;
    try {
      const content = await readStatementContent(entry.file, entry.kind);
      const result = await financeApi.detectStatement(
        {
          kind: entry.kind,
          filename: entry.file.name,
          content,
          mime_type: entry.file.type || undefined,
        },
        session.access_token
      );
      updateEntry(entry.id, {
        status: 'detected',
        documentKind: result.document_kind,
        detectedBankName: result.bank_name,
        accountId:
          result.detected_account_id ??
          guessAccountFromFilename(entry.file.name, activeAccounts),
      });
    } catch (err) {
      updateEntry(entry.id, {
        status: 'error',
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao detectar a conta — selecione manualmente',
        accountId: guessAccountFromFilename(entry.file.name, activeAccounts),
      });
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setError(null);

    const newEntries: ImportFileEntry[] = [];
    for (const file of selected) {
      if (entries.length + newEntries.length >= MAX_FILES) {
        setError(`Máximo de ${MAX_FILES} arquivos por lote.`);
        break;
      }
      const kind = getFileKind(file);
      if (!kind) {
        setError(`${file.name}: formato não suportado. Use CSV, OFX, TXT, PDF ou imagem.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: arquivo muito grande. Tamanho máximo: 10MB.`);
        continue;
      }
      newEntries.push({
        id: crypto.randomUUID(),
        file,
        kind,
        status: 'detecting',
        documentKind: null,
        accountId: null,
        detectedBankName: null,
        error: null,
        rows: [],
      });
    }

    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
      // Detecção em paralelo com concorrência limitada
      void runWithConcurrency(newEntries, (entry) => detectEntry(entry), PARSE_CONCURRENCY);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setError(null);
  };

  // ===== Análise: parse por arquivo + matching =====

  const handleAnalyze = async () => {
    if (!session?.access_token || !canAnalyze) return;
    setAnalyzing(true);
    setError(null);

    try {
      const token = session.access_token;
      const toParse = entries;

      const results = await runWithConcurrency(
        toParse,
        async (entry) => {
          const content = await readStatementContent(entry.file, entry.kind);
          const { transactions } = await financeApi.parseStatement(
            {
              kind: entry.kind,
              filename: entry.file.name,
              content,
              mime_type: entry.file.type || undefined,
              account_id: entry.accountId!,
            },
            token
          );
          return transactions;
        },
        PARSE_CONCURRENCY
      );

      const failures: string[] = [];
      const parsedRows = new Map<string, MultiReviewRow[]>();
      results.forEach((result, i) => {
        const entry = toParse[i];
        if (result.status === 'rejected') {
          const message =
            result.reason instanceof Error ? result.reason.message : 'Erro ao processar';
          failures.push(`${entry.file.name}: ${message}`);
          return;
        }
        parsedRows.set(
          entry.id,
          result.value.map((tx) => ({
            ...tx,
            selected: !tx.possible_duplicate && tx.line_kind !== 'PAGAMENTO_FATURA',
            kind: tx.line_kind,
            transferAccountId: tx.suggested_transfer_account_id,
            pairId: null,
            intraBatchDuplicate: false,
          }))
        );
      });

      if (failures.length > 0) {
        setError(`Falha em ${failures.length} arquivo(s):\n${failures.join('\n')}`);
        return;
      }

      const totalTransactions = [...parsedRows.values()].reduce(
        (sum, rows) => sum + rows.length,
        0
      );
      if (totalTransactions === 0) {
        setError('Nenhuma transação encontrada nos arquivos. Verifique se são extratos válidos.');
        return;
      }

      // Matching de transferências entre os extratos (ordem = ordem das entries)
      const statements: MatchStatementInput[] = toParse.map((entry) => ({
        account_id: entry.accountId!,
        transactions: (parsedRows.get(entry.id) ?? []).map((row) => ({
          description: row.description,
          amount: row.amount,
          type: row.type,
          due_date: row.due_date,
          line_kind: row.line_kind,
          suggested_transfer_account_id: row.suggested_transfer_account_id,
          possible_duplicate: row.possible_duplicate,
        })),
      }));

      const match = await financeApi.matchTransfers({ statements }, token);

      // Duplicatas intra-lote: desmarcar e sinalizar
      for (const ref of match.intra_batch_duplicates) {
        const entry = toParse[ref.statement_index];
        const rows = parsedRows.get(entry.id);
        if (rows?.[ref.tx_index]) {
          rows[ref.tx_index] = {
            ...rows[ref.tx_index],
            intraBatchDuplicate: true,
            selected: false,
          };
        }
      }

      // Pares: vincular as duas pernas e montar os cards
      const reviewPairs: ReviewPair[] = [];
      for (const pair of match.pairs) {
        const outEntry = toParse[pair.out.statement_index];
        const inEntry = toParse[pair.in.statement_index];
        const outRows = parsedRows.get(outEntry.id);
        const inRows = parsedRows.get(inEntry.id);
        const outRow = outRows?.[pair.out.tx_index];
        const inRow = inRows?.[pair.in.tx_index];
        if (!outRow || !inRow || !outRows || !inRows) continue;

        const pairId = crypto.randomUUID();
        const isDuplicate =
          outRow.possible_duplicate ||
          inRow.possible_duplicate ||
          outRow.intraBatchDuplicate ||
          inRow.intraBatchDuplicate;

        outRows[pair.out.tx_index] = { ...outRow, pairId };
        inRows[pair.in.tx_index] = { ...inRow, pairId };

        reviewPairs.push({
          id: pairId,
          outRef: { fileId: outEntry.id, rowIndex: pair.out.tx_index },
          inRef: { fileId: inEntry.id, rowIndex: pair.in.tx_index },
          selected: !isDuplicate,
          // Categoria default: perna DESPESA, senão RECEITA
          categoryId: outRow.category_id ?? inRow.category_id,
          confidence: pair.confidence,
        });
      }

      setEntries((prev) =>
        prev.map((entry) => ({ ...entry, rows: parsedRows.get(entry.id) ?? [] }))
      );
      setPairs(reviewPairs);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar os extratos');
    } finally {
      setAnalyzing(false);
    }
  };

  // ===== Review: pares =====

  const handleUnpair = (pair: ReviewPair) => {
    const outRow = getRow(pair.outRef);
    const inRow = getRow(pair.inRef);
    const outEntry = entries.find((e) => e.id === pair.outRef.fileId);
    const inEntry = entries.find((e) => e.id === pair.inRef.fileId);

    // As pernas voltam às tabelas como transferência interna com a ex-contraparte preenchida
    if (outRow) {
      updateRowByRef(pair.outRef, {
        pairId: null,
        kind: 'TRANSFERENCIA_INTERNA',
        transferAccountId: inEntry?.accountId ?? null,
        selected: !outRow.possible_duplicate && !outRow.intraBatchDuplicate,
      });
    }
    if (inRow) {
      updateRowByRef(pair.inRef, {
        pairId: null,
        kind: 'TRANSFERENCIA_INTERNA',
        transferAccountId: outEntry?.accountId ?? null,
        selected: !inRow.possible_duplicate && !inRow.intraBatchDuplicate,
      });
    }
    setPairs((prev) => prev.filter((p) => p.id !== pair.id));
  };

  const updatePair = (id: string, updates: Partial<ReviewPair>) => {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // ===== Confirmação =====

  const handleImport = async () => {
    if (!session?.access_token || totalSelected === 0) return;

    if (missingCategoryCount > 0) {
      setError(
        `${missingCategoryCount} item(ns) selecionado(s) sem categoria. Defina a categoria ou desmarque-os.`
      );
      return;
    }
    if (missingTransferAccountCount > 0) {
      setError(
        `${missingTransferAccountCount} transferência(s) sem conta de contrapartida. Escolha a conta ou desmarque-as.`
      );
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // Grupos por conta (merge de arquivos da mesma conta), só linhas sem par
      const groupMap = new Map<string, ConfirmImportItem[]>();
      for (const entry of entries) {
        if (!entry.accountId) continue;
        const items = groupMap.get(entry.accountId) ?? [];
        for (const row of entry.rows) {
          if (!row.selected || row.pairId) continue;
          items.push({
            kind: row.kind === 'TRANSFERENCIA_INTERNA' ? 'TRANSFERENCIA_INTERNA' : 'NORMAL',
            category_id: row.category_id!,
            type: row.type,
            description: row.description,
            amount: row.amount,
            due_date: row.due_date,
            notes: row.notes || undefined,
            transfer_account_id:
              row.kind === 'TRANSFERENCIA_INTERNA'
                ? row.transferAccountId || undefined
                : undefined,
          });
        }
        groupMap.set(entry.accountId, items);
      }
      const groups: ConfirmMultiGroup[] = [...groupMap.entries()]
        .filter(([, items]) => items.length > 0)
        .map(([account_id, items]) => ({ account_id, items }));

      // Pares casados: cada um vira UMA transferência
      const transfers: ConfirmMatchedTransfer[] = [];
      for (const pair of selectedPairs) {
        const outRow = getRow(pair.outRef);
        const outEntry = entries.find((e) => e.id === pair.outRef.fileId);
        const inEntry = entries.find((e) => e.id === pair.inRef.fileId);
        if (!outRow || !outEntry?.accountId || !inEntry?.accountId) continue;
        transfers.push({
          source_account_id: outEntry.accountId,
          destination_account_id: inEntry.accountId,
          category_id: pair.categoryId!,
          description: `Transferência ${accountName(outEntry.accountId)} → ${accountName(inEntry.accountId)}`,
          amount: outRow.amount,
          // Data da perna DESPESA: o dinheiro saiu nessa data
          transfer_date: outRow.due_date,
          notes: outRow.notes || undefined,
        });
      }

      const result = await financeApi.confirmImportMulti({ groups, transfers }, session.access_token);

      const parts = [`${result.transactions_created} transação(ões)`];
      if (result.transfers_created > 0) {
        parts.push(`${result.transfers_created} transferência(s)`);
      }
      toast.success(`Importação concluída: ${parts.join(' e ')}`);
      handleOpenChange(false);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar transações');
    } finally {
      setImporting(false);
    }
  };

  const categoriesForType = (type: 'RECEITA' | 'DESPESA') =>
    categories.filter((c) => c.is_active && c.type === type);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.type === 'DESPESA'),
    [categories]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={step === 'review' ? 'sm:max-w-[1080px]' : 'sm:max-w-[640px]'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Importar Vários Extratos
          </DialogTitle>
          <DialogDescription>
            {step === 'files'
              ? 'Envie extratos de várias contas de uma vez. A IA identifica a conta de cada arquivo e relaciona as transferências entre elas.'
              : 'Revise as transações e as transferências entre contas identificadas antes de confirmar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'files' && (
          <div className="space-y-4">
            {/* Área de seleção */}
            <div
              className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para adicionar extratos (até {MAX_FILES} arquivos)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, OFX, TXT, PDF ou imagem (máx. 10MB cada) — somente extratos de conta
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                onChange={handleFilesSelect}
                className="hidden"
              />
            </div>

            {/* Lista de arquivos */}
            {entries.length > 0 && (
              <div className="space-y-2 max-h-[320px] overflow-auto">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    {entry.kind === 'image' ? (
                      <ImageIcon className="h-7 w-7 shrink-0 text-blue-500" />
                    ) : (
                      <FileText className="h-7 w-7 shrink-0 text-primary" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{entry.file.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(entry.file.size / 1024).toFixed(0)} KB
                        </span>
                        {entry.detectedBankName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                            {entry.detectedBankName}
                          </Badge>
                        )}
                      </div>

                      {entry.status === 'detecting' && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Detectando conta...
                        </p>
                      )}

                      {entry.status === 'error' && (
                        <p className="text-xs text-red-500">{entry.error}</p>
                      )}

                      {entry.documentKind === 'CREDIT_CARD_INVOICE' ? (
                        <p className="flex items-start gap-1.5 text-xs text-violet-700">
                          <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          Parece uma fatura de cartão — remova e importe pelo fluxo
                          individual (&quot;Importar Extrato&quot;).
                        </p>
                      ) : (
                        entry.status !== 'detecting' && (
                          <div className="flex items-center gap-2">
                            {entry.documentKind === 'OTHER' && (
                              <span className="text-xs text-amber-600 shrink-0">
                                Documento não reconhecido:
                              </span>
                            )}
                            <Select
                              value={entry.accountId || ''}
                              onValueChange={(value) =>
                                updateEntry(entry.id, { accountId: value })
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-[12px] max-w-[260px] ${
                                  !entry.accountId ? 'border-red-400' : ''
                                }`}
                              >
                                <SelectValue placeholder="Qual conta é este extrato?" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                    {account.bank?.name ? ` (${account.bank.name})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEntry(entry.id)}
                      disabled={analyzing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {invoiceEntries.length > 0 && (
              <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 p-2 rounded">
                Remova {invoiceEntries.length} arquivo(s) de fatura de cartão para continuar —
                este fluxo é apenas para extratos de conta.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded whitespace-pre-line">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={analyzing}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleAnalyze} disabled={!canAnalyze || analyzing}>
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando {entries.length} arquivo(s)...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Resumo agregado */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <strong>{totalSelected}</strong> item(ns) selecionado(s)
              </span>
              {selectedPairs.length > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {selectedPairs.length} transferência(s) entre contas
                </span>
              )}
              <span className="text-emerald-600">
                Receitas: {formatCurrency(totals.receitas)}
              </span>
              <span className="text-red-600">
                Despesas: {formatCurrency(totals.despesas)}
              </span>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {duplicateCount} possível(is) duplicata(s) desmarcada(s)
                </span>
              )}
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="flex items-start gap-1.5 text-[12px] text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                As transações serão registradas como PAGAS e os saldos atualizados. Cada
                transferência pareada abaixo cria um único registro que ajusta as duas contas —
                sem duplicar lançamentos.
              </p>
            </div>

            <div className="max-h-[480px] overflow-auto space-y-4 pr-1">
              {/* Transferências detectadas entre contas */}
              {pairs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                    Transferências detectadas entre contas
                  </h3>
                  {pairs.map((pair) => {
                    const outRow = getRow(pair.outRef);
                    const inRow = getRow(pair.inRef);
                    const outEntry = entries.find((e) => e.id === pair.outRef.fileId);
                    const inEntry = entries.find((e) => e.id === pair.inRef.fileId);
                    if (!outRow || !inRow) return null;
                    const isDuplicate =
                      outRow.possible_duplicate ||
                      inRow.possible_duplicate ||
                      outRow.intraBatchDuplicate ||
                      inRow.intraBatchDuplicate;

                    return (
                      <div
                        key={pair.id}
                        className={`rounded-lg border p-3 space-y-2 ${
                          pair.selected ? 'border-blue-200 bg-blue-50/40' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <Checkbox
                            checked={pair.selected}
                            onCheckedChange={(checked) =>
                              updatePair(pair.id, { selected: checked === true })
                            }
                            aria-label="Selecionar transferência"
                          />
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {accountName(outEntry?.accountId ?? null)}
                            <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                            {accountName(inEntry?.accountId ?? null)}
                          </span>
                          <span className="text-sm font-semibold text-blue-700">
                            {formatCurrency(outRow.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatStatementDate(outRow.due_date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 ${
                              pair.confidence === 'HIGH'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-amber-300 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {pair.confidence === 'HIGH' ? 'Alta confiança' : 'Confira'}
                          </Badge>
                          {isDuplicate && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] px-1.5"
                            >
                              Duplicata?
                            </Badge>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            <Select
                              value={pair.categoryId || ''}
                              onValueChange={(value) =>
                                updatePair(pair.id, { categoryId: value })
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-[12px] w-[180px] ${
                                  pair.selected && !pair.categoryId ? 'border-red-400' : ''
                                }`}
                              >
                                <SelectValue placeholder="Categoria..." />
                              </SelectTrigger>
                              <SelectContent>
                                {expenseCategories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[12px]"
                              onClick={() => handleUnpair(pair)}
                            >
                              <Unlink className="h-3.5 w-3.5 mr-1" />
                              Desfazer par
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pl-7">
                          <p className="truncate">
                            ↑ {outEntry?.file.name}: {outRow.description}
                          </p>
                          <p className="truncate">
                            ↓ {inEntry?.file.name}: {inRow.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tabelas por arquivo */}
              {entries.map((entry) => {
                const visibleRows = entry.rows
                  .map((row, index) => ({ row, index }))
                  .filter(({ row }) => !row.pairId);
                if (visibleRows.length === 0) return null;

                return (
                  <div key={entry.id} className="space-y-1.5">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                      {accountName(entry.accountId)}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({entry.file.name} — {visibleRows.length} transação(ões))
                      </span>
                    </h3>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-white">
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead className="w-24">Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-36">Tipo</TableHead>
                            <TableHead className="w-48">Categoria</TableHead>
                            <TableHead className="w-28 text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleRows.map(({ row, index }) => {
                            const ref: RowRef = { fileId: entry.id, rowIndex: index };
                            return (
                              <TableRow
                                key={index}
                                className={!row.selected ? 'opacity-50' : undefined}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={row.selected}
                                    disabled={row.kind === 'PAGAMENTO_FATURA'}
                                    onCheckedChange={(checked) =>
                                      updateRowByRef(ref, { selected: checked === true })
                                    }
                                    aria-label="Selecionar transação"
                                  />
                                </TableCell>
                                <TableCell className="text-[13px] whitespace-nowrap">
                                  {formatStatementDate(row.due_date)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px]">{row.description}</span>
                                    {row.kind === 'TRANSFERENCIA_INTERNA' && (
                                      <Badge
                                        variant="outline"
                                        className="border-blue-300 bg-blue-50 text-blue-700 text-[10px] px-1.5"
                                      >
                                        <ArrowLeftRight className="h-3 w-3 mr-0.5" />
                                        Transferência
                                      </Badge>
                                    )}
                                    {row.kind === 'PAGAMENTO_FATURA' && (
                                      <Badge
                                        variant="outline"
                                        className="border-violet-300 bg-violet-50 text-violet-700 text-[10px] px-1.5"
                                      >
                                        <CreditCard className="h-3 w-3 mr-0.5" />
                                        Pgto fatura
                                      </Badge>
                                    )}
                                    {row.possible_duplicate && (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] px-1.5"
                                      >
                                        Duplicata?
                                      </Badge>
                                    )}
                                    {row.intraBatchDuplicate && (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] px-1.5"
                                      >
                                        Duplicata no lote
                                      </Badge>
                                    )}
                                  </div>
                                  {row.notes && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {row.notes}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.kind}
                                    onValueChange={(value) =>
                                      updateRowByRef(ref, {
                                        kind: value as StatementLineKind,
                                        selected:
                                          value === 'PAGAMENTO_FATURA' ? false : row.selected,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-[12px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(KIND_LABELS) as StatementLineKind[]).map(
                                        (kind) => (
                                          <SelectItem key={kind} value={kind}>
                                            {KIND_LABELS[kind]}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {row.kind === 'TRANSFERENCIA_INTERNA' && (
                                    <Select
                                      value={row.transferAccountId || ''}
                                      onValueChange={(value) =>
                                        updateRowByRef(ref, { transferAccountId: value })
                                      }
                                    >
                                      <SelectTrigger
                                        className={`h-8 text-[12px] mt-1 ${
                                          row.selected && !row.transferAccountId
                                            ? 'border-red-400'
                                            : ''
                                        }`}
                                      >
                                        <SelectValue
                                          placeholder={
                                            row.type === 'DESPESA'
                                              ? 'Para qual conta?'
                                              : 'De qual conta?'
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {activeAccounts
                                          .filter((account) => account.id !== entry.accountId)
                                          .map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                              {account.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.category_id || ''}
                                    onValueChange={(value) =>
                                      updateRowByRef(ref, { category_id: value })
                                    }
                                  >
                                    <SelectTrigger
                                      className={`h-8 text-[12px] ${
                                        row.selected && !row.category_id
                                          ? 'border-red-300'
                                          : ''
                                      }`}
                                    >
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categoriesForType(row.type).map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell
                                  className={`text-right text-[13px] font-medium whitespace-nowrap ${
                                    row.type === 'RECEITA'
                                      ? 'text-emerald-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {row.type === 'RECEITA' ? '+' : '-'}
                                  {formatCurrency(row.amount)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded whitespace-pre-line">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('files');
                  setPairs([]);
                  setEntries((prev) => prev.map((entry) => ({ ...entry, rows: [] })));
                  setError(null);
                }}
                disabled={importing}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={importing || totalSelected === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${totalSelected} item(ns)`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
