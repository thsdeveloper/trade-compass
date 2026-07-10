'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseCSV, analyzeTradesForImport, type ParsedTrade, type TradeMatchResult } from '@/lib/csv-parser';
import type { DayTrade } from '@/types/daytrade';

export interface TradeToImport extends ParsedTrade {
  status: 'new' | 'update' | 'duplicate';
  existingTradeId?: string;
}

interface ImportTradesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (trades: TradeToImport[]) => Promise<void>;
  existingTrades: DayTrade[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ImportTradesDialog({
  open,
  onOpenChange,
  onImport,
  existingTrades,
}: ImportTradesDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzedTrades, setAnalyzedTrades] = useState<TradeMatchResult[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trades que podem ser selecionados (novos ou para atualizar)
  const selectableIndices = useMemo(() => {
    return analyzedTrades
      .map((t, i) => (t.status !== 'duplicate' ? i : -1))
      .filter((i) => i !== -1);
  }, [analyzedTrades]);

  const selectedTrades = useMemo(() => {
    return analyzedTrades
      .filter((_, i) => selectedRows.has(i))
      .map((r) => ({
        ...r.trade,
        status: r.status,
        existingTradeId: r.existingTradeId,
      }));
  }, [analyzedTrades, selectedRows]);

  const totalResult = useMemo(() => {
    return selectedTrades.reduce((sum, t) => sum + t.result, 0);
  }, [selectedTrades]);

  const counts = useMemo(() => {
    const newCount = analyzedTrades.filter((t) => t.status === 'new').length;
    const updateCount = analyzedTrades.filter((t) => t.status === 'update').length;
    const duplicateCount = analyzedTrades.filter((t) => t.status === 'duplicate').length;
    return { newCount, updateCount, duplicateCount };
  }, [analyzedTrades]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const content = await selectedFile.text();
      const trades = parseCSV(content);

      if (trades.length === 0) {
        setError('Nenhuma operacao encontrada no arquivo');
        setAnalyzedTrades([]);
        setSelectedRows(new Set());
        return;
      }

      // Analisar trades
      const results = analyzeTradesForImport(trades, existingTrades);
      setAnalyzedTrades(results);

      // Selecionar novos e atualizacoes por padrao
      const selectableIdx = results
        .map((t, i) => (t.status !== 'duplicate' ? i : -1))
        .filter((i) => i !== -1);
      setSelectedRows(new Set(selectableIdx));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
      setAnalyzedTrades([]);
      setSelectedRows(new Set());
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setAnalyzedTrades([]);
    setSelectedRows(new Set());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleRow = (index: number) => {
    // Nao permitir selecionar duplicados
    if (analyzedTrades[index]?.status === 'duplicate') return;

    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleToggleAll = () => {
    const allSelectableSelected = selectableIndices.every((i) => selectedRows.has(i));

    if (allSelectableSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIndices));
    }
  };

  const handleImport = async () => {
    if (selectedTrades.length === 0) return;

    setImporting(true);
    try {
      await onImport(selectedTrades);
      handleClearFile();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar operacoes');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      handleClearFile();
      onOpenChange(false);
    }
  };

  const allSelectableSelected = selectableIndices.length > 0 && selectableIndices.every((i) => selectedRows.has(i));

  const selectedNewCount = selectedTrades.filter((t) => t.status === 'new').length;
  const selectedUpdateCount = selectedTrades.filter((t) => t.status === 'update').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Importar Operacoes
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Importe suas operacoes a partir de um arquivo CSV exportado da corretora.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="rounded-full bg-muted p-3">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium">Clique para selecionar arquivo</p>
                <p className="text-[11px] text-muted-foreground/70">Apenas arquivos .csv</p>
              </div>
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-[13px] font-medium">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {analyzedTrades.length} operacoes encontradas
                    {counts.newCount > 0 && (
                      <span className="text-blue-600"> ({counts.newCount} novas)</span>
                    )}
                    {counts.updateCount > 0 && (
                      <span className="text-amber-600"> ({counts.updateCount} para atualizar)</span>
                    )}
                    {counts.duplicateCount > 0 && (
                      <span className="text-muted-foreground"> ({counts.duplicateCount} ja completas)</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClearFile}
                disabled={importing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-[12px]">{error}</p>
            </div>
          )}

          {/* Info about update */}
          {counts.updateCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
              <RefreshCw className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-[12px]">
                <p className="font-medium">Atualizacao de dados</p>
                <p className="text-amber-700 dark:text-amber-400">
                  {counts.updateCount} operacoes serao atualizadas com dados mais precisos (horario com segundos, MEP/MEN).
                  Imagens, notas, stop, parcial e alvo existentes serao preservados.
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {analyzedTrades.length > 0 && (
            <>
              <div className="max-h-[280px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelectableSelected}
                          onCheckedChange={handleToggleAll}
                          disabled={selectableIndices.length === 0}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="w-[90px] text-[11px] font-medium uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide">
                        Ativo
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide">
                        Lado
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide">
                        Entrada
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide text-right">
                        Preco Ent.
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide text-right">
                        Preco Sai.
                      </TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wide text-right">
                        Resultado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyzedTrades.map((item, index) => {
                      const trade = item.trade;
                      const isDuplicate = item.status === 'duplicate';
                      const isUpdate = item.status === 'update';

                      return (
                        <TableRow
                          key={index}
                          className={cn(
                            isDuplicate
                              ? 'bg-muted/30 cursor-not-allowed opacity-50'
                              : isUpdate
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer'
                              : 'cursor-pointer',
                            !selectedRows.has(index) && !isDuplicate && 'opacity-50'
                          )}
                          onClick={() => handleToggleRow(index)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(index)}
                              onCheckedChange={() => handleToggleRow(index)}
                              disabled={isDuplicate}
                              aria-label={`Selecionar operacao ${index + 1}`}
                            />
                          </TableCell>
                          <TableCell>
                            {isDuplicate ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3" />
                                Completo
                              </span>
                            ) : isUpdate ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                <RefreshCw className="h-3 w-3" />
                                Atualizar
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                                Novo
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[12px] font-medium">
                            {trade.asset}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                                trade.direction === 'BUY'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                              )}
                            >
                              {trade.direction === 'BUY' ? 'C' : 'V'}
                            </span>
                          </TableCell>
                          <TableCell className="text-[12px] tabular-nums text-right">
                            {trade.contracts}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {formatDateTime(trade.entry_time)}
                          </TableCell>
                          <TableCell className="text-[12px] tabular-nums text-right">
                            {formatPrice(trade.entry_price)}
                          </TableCell>
                          <TableCell className="text-[12px] tabular-nums text-right">
                            {formatPrice(trade.exit_price)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-[12px] font-medium tabular-nums text-right',
                              trade.result >= 0 ? 'text-emerald-600' : 'text-red-600'
                            )}
                          >
                            {formatCurrency(trade.result)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] text-muted-foreground">
                    {selectedRows.size} operacoes selecionadas
                    {selectedNewCount > 0 && (
                      <span className="text-blue-600"> ({selectedNewCount} novas)</span>
                    )}
                    {selectedUpdateCount > 0 && (
                      <span className="text-amber-600"> ({selectedUpdateCount} atualizacoes)</span>
                    )}
                  </span>
                  {counts.duplicateCount > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {counts.duplicateCount} operacoes ja estao completas no sistema
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">Total:</span>
                  <span
                    className={cn(
                      'text-[14px] font-semibold tabular-nums',
                      totalResult >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(totalResult)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="h-8 px-3 text-[13px]"
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || selectedRows.size === 0}
            className="h-8 px-4 text-[13px]"
          >
            {importing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {selectedUpdateCount > 0 && selectedNewCount === 0
              ? `Atualizar (${selectedRows.size})`
              : selectedUpdateCount > 0
              ? `Importar/Atualizar (${selectedRows.size})`
              : `Importar (${selectedRows.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
