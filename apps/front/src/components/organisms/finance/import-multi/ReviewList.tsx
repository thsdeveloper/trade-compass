'use client';

import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  CreditCard,
  FileText,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStatementDate } from '@/lib/statement-file-utils';
import type { AccountWithBank, FinanceCategory, StatementLineKind } from '@/types/finance';
import { formatCurrency } from '@/types/finance';
import { KIND_LABELS, type MultiReviewRow, type ReviewPair } from './shared';

// Lista de revisão virtualizada: apenas as linhas visíveis são montadas no DOM,
// e cada linha é memoizada — editar uma linha não re-renderiza as demais.

export type ReviewListItem =
  | { type: 'pairs-header'; count: number }
  | {
      type: 'pair';
      pair: ReviewPair;
      outRow: MultiReviewRow;
      inRow: MultiReviewRow;
      outAccountName: string;
      inAccountName: string;
      outFileName: string;
      inFileName: string;
    }
  | {
      type: 'file-header';
      fileId: string;
      accountName: string;
      fileName: string;
      visibleCount: number;
      /** Linhas selecionáveis (exclui pgto fatura) e quantas estão marcadas */
      selectableCount: number;
      selectedCount: number;
    }
  | {
      type: 'row';
      fileId: string;
      accountId: string | null;
      rowIndex: number;
      row: MultiReviewRow;
    };

export interface ReviewListCallbacks {
  onRowSelectedChange: (fileId: string, rowIndex: number, selected: boolean) => void;
  onRowKindChange: (fileId: string, rowIndex: number, kind: StatementLineKind) => void;
  onRowCategoryChange: (fileId: string, rowIndex: number, categoryId: string) => void;
  onRowTransferAccountChange: (fileId: string, rowIndex: number, accountId: string) => void;
  onToggleFileRows: (fileId: string, selected: boolean) => void;
  onPairSelectedChange: (pairId: string, selected: boolean) => void;
  onPairCategoryChange: (pairId: string, categoryId: string) => void;
  onUnpair: (pairId: string) => void;
}

interface ReviewListProps extends ReviewListCallbacks {
  items: ReviewListItem[];
  activeAccounts: AccountWithBank[];
  expenseCategories: FinanceCategory[];
  incomeCategories: FinanceCategory[];
}

const ROW_GRID =
  'grid grid-cols-[32px_84px_minmax(0,1fr)_150px_180px_100px] items-start gap-x-2 px-2';

const ESTIMATED_SIZES: Record<ReviewListItem['type'], number> = {
  'pairs-header': 36,
  pair: 118,
  'file-header': 72,
  row: 54,
};

/**
 * Select nativo estilizado como o SelectTrigger do shadcn. Usado nas linhas
 * virtualizadas porque o Select do Radix é caro de montar (contexto + portal
 * por instância): com 2-3 por linha, o scroll rápido ficava em branco até as
 * linhas novas montarem. O <select> nativo monta em ~0ms.
 */
function NativeSelect({
  value,
  onChange,
  invalid,
  className,
  children,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          'border-input bg-background ring-offset-background focus:ring-ring h-8 w-full cursor-pointer appearance-none truncate rounded-md border py-1 pl-2.5 pr-7 text-[12px] focus:outline-none focus:ring-2 focus:ring-offset-2',
          !value && 'text-muted-foreground',
          invalid && 'border-red-400'
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function itemKey(item: ReviewListItem): string {
  switch (item.type) {
    case 'pairs-header':
      return 'pairs-header';
    case 'pair':
      return `pair:${item.pair.id}`;
    case 'file-header':
      return `fh:${item.fileId}`;
    case 'row':
      return `row:${item.fileId}:${item.rowIndex}`;
  }
}

interface RowItemProps {
  fileId: string;
  accountId: string | null;
  rowIndex: number;
  row: MultiReviewRow;
  activeAccounts: AccountWithBank[];
  expenseCategories: FinanceCategory[];
  incomeCategories: FinanceCategory[];
  onSelectedChange: ReviewListCallbacks['onRowSelectedChange'];
  onKindChange: ReviewListCallbacks['onRowKindChange'];
  onCategoryChange: ReviewListCallbacks['onRowCategoryChange'];
  onTransferAccountChange: ReviewListCallbacks['onRowTransferAccountChange'];
}

const RowItem = memo(function RowItem({
  fileId,
  accountId,
  rowIndex,
  row,
  activeAccounts,
  expenseCategories,
  incomeCategories,
  onSelectedChange,
  onKindChange,
  onCategoryChange,
  onTransferAccountChange,
}: RowItemProps) {
  const categories = row.type === 'RECEITA' ? incomeCategories : expenseCategories;

  return (
    <div
      className={cn(
        `${ROW_GRID} border-b bg-background py-1.5 hover:bg-muted/40`,
        !row.selected && 'opacity-50'
      )}
    >
      <div className="pt-1.5">
        <Checkbox
          checked={row.selected}
          disabled={row.kind === 'PAGAMENTO_FATURA'}
          onCheckedChange={(checked) => onSelectedChange(fileId, rowIndex, checked === true)}
          aria-label="Selecionar transação"
        />
      </div>
      <div className="pt-1.5 text-[13px] whitespace-nowrap">
        {formatStatementDate(row.due_date)}
      </div>
      <div className="min-w-0 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
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
          <p className="text-[11px] text-muted-foreground">{row.notes}</p>
        )}
      </div>
      <div>
        <NativeSelect
          value={row.kind}
          onChange={(value) => onKindChange(fileId, rowIndex, value as StatementLineKind)}
          aria-label="Tipo da linha"
        >
          {(Object.keys(KIND_LABELS) as StatementLineKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </NativeSelect>
        {row.kind === 'TRANSFERENCIA_INTERNA' && (
          <NativeSelect
            value={row.transferAccountId || ''}
            onChange={(value) => onTransferAccountChange(fileId, rowIndex, value)}
            invalid={row.selected && !row.transferAccountId}
            className="mt-1"
            aria-label="Conta de contrapartida"
          >
            <option value="" disabled>
              {row.type === 'DESPESA' ? 'Para qual conta?' : 'De qual conta?'}
            </option>
            {activeAccounts
              .filter((account) => account.id !== accountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </NativeSelect>
        )}
      </div>
      <div>
        <NativeSelect
          value={row.category_id || ''}
          onChange={(value) => onCategoryChange(fileId, rowIndex, value)}
          invalid={row.selected && !row.category_id}
          aria-label="Categoria"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div
        className={cn(
          'pt-1.5 text-right text-[13px] font-medium whitespace-nowrap',
          row.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'
        )}
      >
        {row.type === 'RECEITA' ? '+' : '-'}
        {formatCurrency(row.amount)}
      </div>
    </div>
  );
});

interface PairItemProps {
  pair: ReviewPair;
  outRow: MultiReviewRow;
  inRow: MultiReviewRow;
  outAccountName: string;
  inAccountName: string;
  outFileName: string;
  inFileName: string;
  expenseCategories: FinanceCategory[];
  onSelectedChange: ReviewListCallbacks['onPairSelectedChange'];
  onCategoryChange: ReviewListCallbacks['onPairCategoryChange'];
  onUnpair: ReviewListCallbacks['onUnpair'];
}

const PairItem = memo(function PairItem({
  pair,
  outRow,
  inRow,
  outAccountName,
  inAccountName,
  outFileName,
  inFileName,
  expenseCategories,
  onSelectedChange,
  onCategoryChange,
  onUnpair,
}: PairItemProps) {
  const isDuplicate =
    outRow.possible_duplicate ||
    inRow.possible_duplicate ||
    outRow.intraBatchDuplicate ||
    inRow.intraBatchDuplicate;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 mb-2',
        pair.selected ? 'border-blue-200 bg-blue-50/40' : 'opacity-60'
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Checkbox
          checked={pair.selected}
          onCheckedChange={(checked) => onSelectedChange(pair.id, checked === true)}
          aria-label="Selecionar transferência"
        />
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {outAccountName}
          <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
          {inAccountName}
        </span>
        <span className="text-sm font-semibold text-blue-700">
          {formatCurrency(outRow.amount)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatStatementDate(outRow.due_date)}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5',
            pair.confidence === 'HIGH'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-amber-300 bg-amber-50 text-amber-700'
          )}
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
            onValueChange={(value) => onCategoryChange(pair.id, value)}
          >
            <SelectTrigger
              className={cn(
                'h-8 text-[12px] w-[180px]',
                pair.selected && !pair.categoryId && 'border-red-400'
              )}
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
            onClick={() => onUnpair(pair.id)}
          >
            <Unlink className="h-3.5 w-3.5 mr-1" />
            Desfazer par
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pl-7">
        <p className="truncate">↑ {outFileName}: {outRow.description}</p>
        <p className="truncate">↓ {inFileName}: {inRow.description}</p>
      </div>
    </div>
  );
});

interface FileHeaderItemProps {
  fileId: string;
  accountName: string;
  fileName: string;
  visibleCount: number;
  selectableCount: number;
  selectedCount: number;
  onToggleFileRows: ReviewListCallbacks['onToggleFileRows'];
}

const FileHeaderItem = memo(function FileHeaderItem({
  fileId,
  accountName,
  fileName,
  visibleCount,
  selectableCount,
  selectedCount,
  onToggleFileRows,
}: FileHeaderItemProps) {
  const checked =
    selectedCount === 0
      ? false
      : selectedCount >= selectableCount
        ? true
        : ('indeterminate' as const);

  return (
    <div className="bg-background pt-3">
      <h3 className="flex items-center gap-1.5 px-2 pb-1.5 text-sm font-semibold">
        <FileText className="h-4 w-4 text-primary" />
        {accountName}
        <span className="text-xs font-normal text-muted-foreground">
          ({fileName} — {visibleCount} transação(ões))
        </span>
      </h3>
      <div
        className={`${ROW_GRID} border-y bg-muted/50 py-1.5 text-xs font-medium text-muted-foreground`}
      >
        <div>
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => onToggleFileRows(fileId, value === true)}
            aria-label="Selecionar todas as transações do arquivo"
          />
        </div>
        <div>Data</div>
        <div>Descrição</div>
        <div>Tipo</div>
        <div>Categoria</div>
        <div className="text-right">Valor</div>
      </div>
    </div>
  );
});

function PairsHeader({ count }: { count: number }) {
  return (
    <h3 className="flex items-center gap-1.5 px-2 pb-2 text-sm font-semibold">
      <ArrowLeftRight className="h-4 w-4 text-blue-600" />
      Transferências detectadas entre contas ({count})
    </h3>
  );
}

export function ReviewList({
  items,
  activeAccounts,
  expenseCategories,
  incomeCategories,
  onRowSelectedChange,
  onRowKindChange,
  onRowCategoryChange,
  onRowTransferAccountChange,
  onToggleFileRows,
  onPairSelectedChange,
  onPairCategoryChange,
  onUnpair,
}: ReviewListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ESTIMATED_SIZES[items[index].type],
    getItemKey: (index) => itemKey(items[index]),
    // Folga generosa acima/abaixo da viewport: as linhas agora são baratas de
    // montar (selects nativos), então overscan alto não pesa e evita área em
    // branco no scroll rápido.
    overscan: 16,
  });

  return (
    <div
      ref={scrollRef}
      className="max-h-[48vh] min-h-[200px] overflow-y-auto rounded-lg border"
    >
      <div
        style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={item.type === 'pair' ? 'px-2' : undefined}
            >
              {item.type === 'pairs-header' && <PairsHeader count={item.count} />}
              {item.type === 'pair' && (
                <PairItem
                  pair={item.pair}
                  outRow={item.outRow}
                  inRow={item.inRow}
                  outAccountName={item.outAccountName}
                  inAccountName={item.inAccountName}
                  outFileName={item.outFileName}
                  inFileName={item.inFileName}
                  expenseCategories={expenseCategories}
                  onSelectedChange={onPairSelectedChange}
                  onCategoryChange={onPairCategoryChange}
                  onUnpair={onUnpair}
                />
              )}
              {item.type === 'file-header' && (
                <FileHeaderItem
                  fileId={item.fileId}
                  accountName={item.accountName}
                  fileName={item.fileName}
                  visibleCount={item.visibleCount}
                  selectableCount={item.selectableCount}
                  selectedCount={item.selectedCount}
                  onToggleFileRows={onToggleFileRows}
                />
              )}
              {item.type === 'row' && (
                <RowItem
                  fileId={item.fileId}
                  accountId={item.accountId}
                  rowIndex={item.rowIndex}
                  row={item.row}
                  activeAccounts={activeAccounts}
                  expenseCategories={expenseCategories}
                  incomeCategories={incomeCategories}
                  onSelectedChange={onRowSelectedChange}
                  onKindChange={onRowKindChange}
                  onCategoryChange={onRowCategoryChange}
                  onTransferAccountChange={onRowTransferAccountChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
