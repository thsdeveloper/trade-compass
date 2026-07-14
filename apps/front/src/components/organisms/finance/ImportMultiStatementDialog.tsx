'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AIButton } from '@/components/ui/ai-button';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  FileText,
  Filter,
  Image as ImageIcon,
  Info,
  Loader2,
  Scale,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/finance-api';
import {
  ACCEPT,
  MAX_FILE_SIZE,
  getFileKind,
  readStatementContent,
} from '@/lib/statement-file-utils';
import { toast } from '@/lib/toast';
import type {
  AccountWithBank,
  FinanceCategory,
  ConfirmImportItem,
  ConfirmMatchedTransfer,
  ConfirmMultiGroup,
  MatchStatementInput,
  StatementLineKind,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import {
  KIND_LABELS,
  MAX_FILES,
  PARSE_CONCURRENCY,
  guessAccountFromFilename,
  runWithConcurrency,
  similarityKeyFor,
  type ImportFileEntry,
  type MultiReviewRow,
  type ReviewPair,
  type RowRef,
} from './import-multi/shared';
import { ReviewList, type ReviewListItem } from './import-multi/ReviewList';

interface ImportMultiStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithBank[];
  categories: FinanceCategory[];
  onImported: () => void;
}

/** Linha exige ação do usuário antes de importar (ou é duplicata a revisar) */
function isRowPending(row: MultiReviewRow): boolean {
  if (row.pairId || row.kind === 'PAGAMENTO_FATURA') return false;
  if (row.selected) {
    return (
      !row.category_id ||
      (row.kind === 'TRANSFERENCIA_INTERNA' && !row.transferAccountId)
    );
  }
  return row.possible_duplicate || row.intraBatchDuplicate;
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
  const [onlyPending, setOnlyPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'close' | 'back' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs sempre em sincronia com o estado: permitem callbacks estáveis
  // (useCallback sem dependências) para que as linhas memoizadas da lista
  // virtualizada não re-renderizem quando os handlers mudariam de identidade.
  const entriesRef = useRef<ImportFileEntry[]>(entries);
  const pairsRef = useRef<ReviewPair[]>(pairs);

  const commitEntries = useCallback(
    (updater: (prev: ImportFileEntry[]) => ImportFileEntry[]) => {
      entriesRef.current = updater(entriesRef.current);
      setEntries(entriesRef.current);
    },
    []
  );
  const commitPairs = useCallback(
    (updater: (prev: ReviewPair[]) => ReviewPair[]) => {
      pairsRef.current = updater(pairsRef.current);
      setPairs(pairsRef.current);
    },
    []
  );

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accounts) map.set(account.id, account.name);
    return map;
  }, [accounts]);
  const accountName = useCallback(
    (id: string | null) => (id && accountNameById.get(id)) || 'Conta',
    [accountNameById]
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.type === 'DESPESA'),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.type === 'RECEITA'),
    [categories]
  );

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

  const pendingExpenseCount = useMemo(
    () => unpairedSelectedRows.filter((r) => r.type === 'DESPESA' && !r.category_id).length,
    [unpairedSelectedRows]
  );
  const pendingIncomeCount = useMemo(
    () => unpairedSelectedRows.filter((r) => r.type === 'RECEITA' && !r.category_id).length,
    [unpairedSelectedRows]
  );
  const pendingCount = useMemo(() => {
    let count = pairs.filter((p) => p.selected && !p.categoryId).length;
    for (const entry of entries) {
      for (const row of entry.rows) if (isRowPending(row)) count++;
    }
    return count;
  }, [entries, pairs]);

  // Seleção global (barra de ações em massa)
  const selectionStats = useMemo(() => {
    let selectable = 0;
    let selected = 0;
    for (const entry of entries) {
      for (const row of entry.rows) {
        if (row.pairId || row.kind === 'PAGAMENTO_FATURA') continue;
        if (!row.possible_duplicate && !row.intraBatchDuplicate) selectable++;
        if (row.selected) selected++;
      }
    }
    selectable += pairs.length;
    selected += selectedPairs.length;
    return { selectable, selected };
  }, [entries, pairs, selectedPairs]);

  // ===== Conciliação: saldo projetado por conta =====
  const balanceProjections = useMemo(() => {
    const deltas = new Map<string, number>();
    const add = (accountId: string, value: number) =>
      deltas.set(accountId, (deltas.get(accountId) ?? 0) + value);

    for (const entry of entries) {
      if (!entry.accountId) continue;
      for (const row of entry.rows) {
        if (!row.selected || row.pairId) continue;
        const signed = row.type === 'RECEITA' ? row.amount : -row.amount;
        add(entry.accountId, signed);
        if (row.kind === 'TRANSFERENCIA_INTERNA' && row.transferAccountId) {
          add(row.transferAccountId, -signed);
        }
      }
    }
    for (const pair of pairs) {
      if (!pair.selected) continue;
      const outAccountId = entries.find((e) => e.id === pair.outRef.fileId)?.accountId;
      const inAccountId = entries.find((e) => e.id === pair.inRef.fileId)?.accountId;
      const amount =
        entries.find((e) => e.id === pair.outRef.fileId)?.rows[pair.outRef.rowIndex]
          ?.amount ?? 0;
      if (outAccountId) add(outAccountId, -amount);
      if (inAccountId) add(inAccountId, amount);
    }

    return [...deltas.entries()]
      .map(([accountId, delta]) => {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) return null;
        return {
          accountId,
          name: account.name,
          current: account.current_balance,
          delta,
          projected: account.current_balance + delta,
        };
      })
      .filter(Boolean) as {
      accountId: string;
      name: string;
      current: number;
      delta: number;
      projected: number;
    }[];
  }, [entries, pairs, accounts]);

  // ===== Itens da lista virtualizada =====
  const listItems = useMemo(() => {
    const items: ReviewListItem[] = [];

    const visiblePairs = onlyPending
      ? pairs.filter((p) => p.selected && !p.categoryId)
      : pairs;
    if (visiblePairs.length > 0) {
      items.push({ type: 'pairs-header', count: visiblePairs.length });
      for (const pair of visiblePairs) {
        const outEntry = entries.find((e) => e.id === pair.outRef.fileId);
        const inEntry = entries.find((e) => e.id === pair.inRef.fileId);
        const outRow = outEntry?.rows[pair.outRef.rowIndex];
        const inRow = inEntry?.rows[pair.inRef.rowIndex];
        if (!outEntry || !inEntry || !outRow || !inRow) continue;
        items.push({
          type: 'pair',
          pair,
          outRow,
          inRow,
          outAccountName: accountName(outEntry.accountId),
          inAccountName: accountName(inEntry.accountId),
          outFileName: outEntry.file.name,
          inFileName: inEntry.file.name,
        });
      }
    }

    for (const entry of entries) {
      const visible: { row: MultiReviewRow; index: number }[] = [];
      let selectableCount = 0;
      let selectedCount = 0;
      entry.rows.forEach((row, index) => {
        if (row.pairId) return;
        if (onlyPending && !isRowPending(row)) return;
        visible.push({ row, index });
        if (row.kind !== 'PAGAMENTO_FATURA') {
          if (!row.possible_duplicate && !row.intraBatchDuplicate) selectableCount++;
          if (row.selected) selectedCount++;
        }
      });
      if (visible.length === 0) continue;
      items.push({
        type: 'file-header',
        fileId: entry.id,
        accountName: accountName(entry.accountId),
        fileName: entry.file.name,
        visibleCount: visible.length,
        selectableCount,
        selectedCount,
      });
      for (const { row, index } of visible) {
        items.push({
          type: 'row',
          fileId: entry.id,
          accountId: entry.accountId,
          rowIndex: index,
          row,
        });
      }
    }
    return items;
  }, [entries, pairs, onlyPending, accountName]);

  // ===== Ciclo de vida do modal =====

  const resetState = useCallback(() => {
    setStep('files');
    commitEntries(() => []);
    commitPairs(() => []);
    setAnalyzing(false);
    setImporting(false);
    setError(null);
    setOnlyPending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [commitEntries, commitPairs]);

  const closeNow = () => {
    resetState();
    onOpenChange(false);
  };

  /** Fechar só é permitido mediante confirmação quando há trabalho em andamento */
  const requestClose = () => {
    if (analyzing || importing) return;
    if (entriesRef.current.length > 0) setConfirmAction('close');
    else closeNow();
  };

  const handleOpenChange = (value: boolean) => {
    if (value) onOpenChange(true);
    else requestClose();
  };

  const goBackToFiles = () => {
    setStep('files');
    commitPairs(() => []);
    commitEntries((prev) => prev.map((entry) => ({ ...entry, rows: [] })));
    setError(null);
    setOnlyPending(false);
  };

  const handleConfirmAction = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'close') closeNow();
    else if (action === 'back') goBackToFiles();
  };

  const updateEntry = useCallback(
    (id: string, updates: Partial<ImportFileEntry>) => {
      commitEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
      );
    },
    [commitEntries]
  );

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
      commitEntries((prev) => [...prev, ...newEntries]);
      // Detecção em paralelo com concorrência limitada
      void runWithConcurrency(newEntries, (entry) => detectEntry(entry), PARSE_CONCURRENCY);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveEntry = (id: string) => {
    commitEntries((prev) => prev.filter((entry) => entry.id !== id));
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
            simKey: similarityKeyFor(tx.type, tx.description),
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

      commitEntries((prev) =>
        prev.map((entry) => ({ ...entry, rows: parsedRows.get(entry.id) ?? [] }))
      );
      commitPairs(() => reviewPairs);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar os extratos');
    } finally {
      setAnalyzing(false);
    }
  };

  // ===== Review: edição de linhas (callbacks estáveis p/ lista virtualizada) =====

  const onRowSelectedChange = useCallback(
    (fileId: string, rowIndex: number, selected: boolean) => {
      commitEntries((prev) =>
        prev.map((entry) =>
          entry.id === fileId
            ? {
                ...entry,
                rows: entry.rows.map((row, i) =>
                  i === rowIndex ? { ...row, selected } : row
                ),
              }
            : entry
        )
      );
    },
    [commitEntries]
  );

  const onRowKindChange = useCallback(
    (fileId: string, rowIndex: number, kind: StatementLineKind) => {
      const sourceEntry = entriesRef.current.find((e) => e.id === fileId);
      const source = sourceEntry?.rows[rowIndex];
      if (!sourceEntry || !source) return;

      let propagated = 0;
      commitEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          rows: entry.rows.map((row, i) => {
            const isSource = entry.id === fileId && i === rowIndex;
            if (isSource) {
              return {
                ...row,
                kind,
                kindEdited: true,
                selected: kind === 'PAGAMENTO_FATURA' ? false : row.selected,
              };
            }
            // Propaga para transações semelhantes ainda não editadas manualmente
            if (
              source.simKey &&
              row.simKey === source.simKey &&
              !row.pairId &&
              !row.kindEdited &&
              row.kind !== kind
            ) {
              propagated++;
              return {
                ...row,
                kind,
                selected: kind === 'PAGAMENTO_FATURA' ? false : row.selected,
                // Contraparte só é reaproveitável entre extratos da mesma conta
                transferAccountId:
                  kind === 'TRANSFERENCIA_INTERNA' &&
                  !row.transferAccountId &&
                  entry.accountId === sourceEntry.accountId
                    ? source.transferAccountId
                    : row.transferAccountId,
              };
            }
            return row;
          }),
        }))
      );
      if (propagated > 0) {
        toast.info(
          `Tipo "${KIND_LABELS[kind]}" aplicado a mais ${propagated} transação(ões) semelhante(s)`
        );
      }
    },
    [commitEntries]
  );

  const onRowCategoryChange = useCallback(
    (fileId: string, rowIndex: number, categoryId: string) => {
      const source = entriesRef.current.find((e) => e.id === fileId)?.rows[rowIndex];
      if (!source) return;

      let propagated = 0;
      commitEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          rows: entry.rows.map((row, i) => {
            if (entry.id === fileId && i === rowIndex) {
              return { ...row, category_id: categoryId, categoryEdited: true };
            }
            // Preenche apenas semelhantes ainda sem categoria (nunca sobrescreve)
            if (
              source.simKey &&
              row.simKey === source.simKey &&
              !row.pairId &&
              !row.category_id &&
              !row.categoryEdited
            ) {
              propagated++;
              return { ...row, category_id: categoryId };
            }
            return row;
          }),
        }))
      );
      if (propagated > 0) {
        toast.info(
          `Categoria aplicada a mais ${propagated} transação(ões) semelhante(s) sem categoria`
        );
      }
    },
    [commitEntries]
  );

  const onRowTransferAccountChange = useCallback(
    (fileId: string, rowIndex: number, accountId: string) => {
      const sourceEntry = entriesRef.current.find((e) => e.id === fileId);
      const source = sourceEntry?.rows[rowIndex];
      if (!sourceEntry || !source) return;

      let propagated = 0;
      commitEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          rows: entry.rows.map((row, i) => {
            if (entry.id === fileId && i === rowIndex) {
              return { ...row, transferAccountId: accountId };
            }
            if (
              source.simKey &&
              row.simKey === source.simKey &&
              !row.pairId &&
              row.kind === 'TRANSFERENCIA_INTERNA' &&
              !row.transferAccountId &&
              entry.accountId === sourceEntry.accountId
            ) {
              propagated++;
              return { ...row, transferAccountId: accountId };
            }
            return row;
          }),
        }))
      );
      if (propagated > 0) {
        toast.info(
          `Conta de contrapartida aplicada a mais ${propagated} transferência(s) semelhante(s)`
        );
      }
    },
    [commitEntries]
  );

  const onToggleFileRows = useCallback(
    (fileId: string, selected: boolean) => {
      commitEntries((prev) =>
        prev.map((entry) =>
          entry.id === fileId
            ? {
                ...entry,
                rows: entry.rows.map((row) => {
                  if (row.pairId || row.kind === 'PAGAMENTO_FATURA') return row;
                  // Duplicatas só entram na seleção individualmente
                  if (selected && (row.possible_duplicate || row.intraBatchDuplicate)) {
                    return row;
                  }
                  return row.selected === selected ? row : { ...row, selected };
                }),
              }
            : entry
        )
      );
    },
    [commitEntries]
  );

  const handleToggleAll = (selected: boolean) => {
    commitEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        rows: entry.rows.map((row) => {
          if (row.pairId || row.kind === 'PAGAMENTO_FATURA') return row;
          if (selected && (row.possible_duplicate || row.intraBatchDuplicate)) return row;
          return row.selected === selected ? row : { ...row, selected };
        }),
      }))
    );
    commitPairs((prev) => prev.map((p) => (p.selected === selected ? p : { ...p, selected })));
  };

  const applyCategoryToPending = (type: 'RECEITA' | 'DESPESA', categoryId: string) => {
    let count = 0;
    commitEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        rows: entry.rows.map((row) => {
          if (
            row.pairId ||
            !row.selected ||
            row.category_id ||
            row.type !== type ||
            row.kind === 'PAGAMENTO_FATURA'
          ) {
            return row;
          }
          count++;
          return { ...row, category_id: categoryId };
        }),
      }))
    );
    if (count > 0) {
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'Categoria';
      toast.success(
        `"${categoryName}" aplicada a ${count} ${
          type === 'DESPESA' ? 'despesa(s)' : 'receita(s)'
        } pendente(s)`
      );
    }
  };

  // ===== Review: pares =====

  const onPairSelectedChange = useCallback(
    (pairId: string, selected: boolean) => {
      commitPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, selected } : p)));
    },
    [commitPairs]
  );

  const onPairCategoryChange = useCallback(
    (pairId: string, categoryId: string) => {
      commitPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, categoryId } : p)));
    },
    [commitPairs]
  );

  const onUnpair = useCallback(
    (pairId: string) => {
      const pair = pairsRef.current.find((p) => p.id === pairId);
      if (!pair) return;
      const outEntry = entriesRef.current.find((e) => e.id === pair.outRef.fileId);
      const inEntry = entriesRef.current.find((e) => e.id === pair.inRef.fileId);

      // As pernas voltam às tabelas como transferência interna com a ex-contraparte preenchida
      const restoreLeg = (
        row: MultiReviewRow,
        counterpartAccountId: string | null
      ): MultiReviewRow => ({
        ...row,
        pairId: null,
        kind: 'TRANSFERENCIA_INTERNA',
        transferAccountId: counterpartAccountId,
        selected: !row.possible_duplicate && !row.intraBatchDuplicate,
      });

      commitEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== pair.outRef.fileId && entry.id !== pair.inRef.fileId) return entry;
          return {
            ...entry,
            rows: entry.rows.map((row, i) => {
              if (entry.id === pair.outRef.fileId && i === pair.outRef.rowIndex) {
                return restoreLeg(row, inEntry?.accountId ?? null);
              }
              if (entry.id === pair.inRef.fileId && i === pair.inRef.rowIndex) {
                return restoreLeg(row, outEntry?.accountId ?? null);
              }
              return row;
            }),
          };
        })
      );
      commitPairs((prev) => prev.filter((p) => p.id !== pairId));
    },
    [commitEntries, commitPairs]
  );

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

      const result = await financeApi.confirmImportMulti(
        { groups, transfers },
        session.access_token
      );

      const parts = [`${result.transactions_created} transação(ões)`];
      if (result.transfers_created > 0) {
        parts.push(`${result.transfers_created} transferência(s)`);
      }
      toast.success(`Importação concluída: ${parts.join(' e ')}`);
      closeNow();
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar transações');
    } finally {
      setImporting(false);
    }
  };

  const dirty = entries.length > 0;
  const blockDismiss = dirty || analyzing || importing;
  const allChecked =
    selectionStats.selected === 0
      ? false
      : selectionStats.selected >= selectionStats.selectable
        ? true
        : ('indeterminate' as const);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={step === 'review' ? 'sm:max-w-[1080px]' : 'sm:max-w-[640px]'}
          onPointerDownOutside={(e) => {
            if (blockDismiss) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (blockDismiss) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (blockDismiss) {
              e.preventDefault();
              requestClose();
            }
          }}
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
                  onClick={requestClose}
                  disabled={analyzing}
                >
                  Cancelar
                </Button>
                <AIButton onClick={handleAnalyze} disabled={!canAnalyze} loading={analyzing}>
                  {analyzing
                    ? `Analisando ${entries.length} arquivo(s)...`
                    : 'Analisar com IA'}
                </AIButton>
              </DialogFooter>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-3">
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

              {/* Conciliação: saldo projetado por conta após a importação */}
              {balanceProjections.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 p-2 text-xs">
                  <span className="flex items-center gap-1 font-medium">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    Saldo projetado:
                  </span>
                  {balanceProjections.map((projection) => (
                    <span key={projection.accountId} className="whitespace-nowrap">
                      {projection.name}: {formatCurrency(projection.current)} →{' '}
                      <strong
                        className={
                          projection.delta >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }
                      >
                        {formatCurrency(projection.projected)}
                      </strong>
                    </span>
                  ))}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Info className="h-3 w-3 shrink-0" />
                    Confira se bate com o saldo final de cada extrato.
                  </span>
                </div>
              )}

              {/* Barra de ações em massa */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(value) => handleToggleAll(value === true)}
                  aria-label="Selecionar todas as transações"
                />
                <span className="text-xs text-muted-foreground">
                  {selectionStats.selected} de {selectionStats.selectable} marcada(s)
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {pendingExpenseCount > 0 && (
                    <Select
                      value=""
                      onValueChange={(value) => applyCategoryToPending('DESPESA', value)}
                    >
                      <SelectTrigger className="h-8 w-[240px] text-[12px]">
                        <span className="flex items-center gap-1.5 truncate">
                          <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          Categoria p/ {pendingExpenseCount} despesa(s) pendente(s)
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {pendingIncomeCount > 0 && (
                    <Select
                      value=""
                      onValueChange={(value) => applyCategoryToPending('RECEITA', value)}
                    >
                      <SelectTrigger className="h-8 w-[240px] text-[12px]">
                        <span className="flex items-center gap-1.5 truncate">
                          <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          Categoria p/ {pendingIncomeCount} receita(s) pendente(s)
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {incomeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={onlyPending ? 'default' : 'outline'}
                    className="h-8 text-[12px]"
                    onClick={() => setOnlyPending((v) => !v)}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    Só pendências ({pendingCount})
                  </Button>
                </div>
              </div>

              {onlyPending && pendingCount === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
                  Nenhuma pendência — tudo pronto para importar.
                </div>
              ) : (
                <ReviewList
                  items={listItems}
                  activeAccounts={activeAccounts}
                  expenseCategories={expenseCategories}
                  incomeCategories={incomeCategories}
                  onRowSelectedChange={onRowSelectedChange}
                  onRowKindChange={onRowKindChange}
                  onRowCategoryChange={onRowCategoryChange}
                  onRowTransferAccountChange={onRowTransferAccountChange}
                  onToggleFileRows={onToggleFileRows}
                  onPairSelectedChange={onPairSelectedChange}
                  onPairCategoryChange={onPairCategoryChange}
                  onUnpair={onUnpair}
                />
              )}

              <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                As transações serão registradas como PAGAS e os saldos atualizados. Cada
                transferência pareada cria um único registro que ajusta as duas contas.
                Alterar tipo ou categoria de uma linha aplica automaticamente às
                semelhantes ainda pendentes.
              </p>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 p-2 rounded whitespace-pre-line">
                  {error}
                </p>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction('back')}
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

      {/* Confirmação antes de descartar o trabalho de revisão */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(value) => {
          if (!value) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'back'
                ? 'Voltar para a seleção de arquivos?'
                : 'Descartar importação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'back'
                ? 'A análise e todos os ajustes feitos nesta revisão serão perdidos. Será necessário analisar os arquivos novamente.'
                : 'Os arquivos enviados e todos os ajustes feitos nesta revisão serão perdidos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction === 'back' ? 'Voltar mesmo assim' : 'Descartar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
