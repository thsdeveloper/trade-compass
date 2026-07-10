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
  CreditCard,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';
import type {
  AccountWithBank,
  FinanceCategory,
  FinanceCreditCard,
  ConfirmImportItem,
  ImportPreviewTransaction,
  StatementFileKind,
  StatementLineKind,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface ImportStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithBank[];
  creditCards: FinanceCreditCard[];
  categories: FinanceCategory[];
  onImported: () => void;
}

interface ReviewRow extends ImportPreviewTransaction {
  selected: boolean;
  /** Classificação editável (a IA sugere, o usuário pode corrigir) */
  kind: StatementLineKind;
  /** Conta contraparte para transferências internas */
  transferAccountId: string | null;
}

const KIND_LABELS: Record<StatementLineKind, string> = {
  NORMAL: 'Normal',
  TRANSFERENCIA_INTERNA: 'Transferência',
  PAGAMENTO_FATURA: 'Pgto fatura',
};

type TargetType = 'account' | 'credit_card';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const TEXT_EXTENSIONS = ['csv', 'txt', 'ofx', 'qfx', 'qif'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const ACCEPT =
  '.csv,.txt,.ofx,.qfx,.qif,.pdf,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,text/plain,image/jpeg,image/png,image/webp';

function getFileKind(file: File): StatementFileKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('text/')) return 'text';
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:...;base64,
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function ImportStatementDialog({
  open,
  onOpenChange,
  accounts,
  creditCards,
  categories,
  onImported,
}: ImportStatementDialogProps) {
  const { session } = useAuth();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [targetType, setTargetType] = useState<TargetType>('account');
  const [targetId, setTargetId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const activeCards = useMemo(() => creditCards.filter((c) => c.is_active), [creditCards]);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const duplicateCount = useMemo(
    () => rows.filter((r) => r.possible_duplicate).length,
    [rows]
  );
  const missingCategoryCount = useMemo(
    () => selectedRows.filter((r) => !r.category_id).length,
    [selectedRows]
  );
  const missingTransferAccountCount = useMemo(
    () =>
      selectedRows.filter(
        (r) => r.kind === 'TRANSFERENCIA_INTERNA' && !r.transferAccountId
      ).length,
    [selectedRows]
  );
  const invoicePaymentCount = useMemo(
    () => rows.filter((r) => r.kind === 'PAGAMENTO_FATURA').length,
    [rows]
  );
  const totals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const row of selectedRows) {
      if (row.type === 'RECEITA') receitas += row.amount;
      else despesas += row.amount;
    }
    return { receitas, despesas };
  }, [selectedRows]);

  const resetState = () => {
    setStep('upload');
    setTargetType('account');
    setTargetId('');
    setFile(null);
    setParsing(false);
    setImporting(false);
    setError(null);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);

    if (!getFileKind(selected)) {
      setError('Formato não suportado. Use CSV, OFX, TXT, PDF ou imagem.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleParse = async () => {
    if (!file || !targetId || !session?.access_token) return;

    setParsing(true);
    setError(null);

    try {
      const kind = getFileKind(file)!;
      const content =
        kind === 'text' ? await file.text() : await readFileAsBase64(file);

      const { transactions } = await financeApi.parseStatement(
        {
          kind,
          filename: file.name,
          content,
          mime_type: file.type || undefined,
          account_id: targetType === 'account' ? targetId : undefined,
          credit_card_id: targetType === 'credit_card' ? targetId : undefined,
        },
        session.access_token
      );

      if (transactions.length === 0) {
        setError(
          'Nenhuma transação encontrada no arquivo. Verifique se é um extrato válido.'
        );
        return;
      }

      // Duplicatas e pagamentos de fatura começam desmarcados:
      // duplicata evita cadastro duplo; pagamento de fatura deve ser tratado
      // pelo fluxo de faturas (senão o gasto do cartão conta duas vezes)
      setRows(
        transactions.map((tx) => ({
          ...tx,
          selected: !tx.possible_duplicate && tx.line_kind !== 'PAGAMENTO_FATURA',
          kind: tx.line_kind,
          transferAccountId: tx.suggested_transfer_account_id,
        }))
      );
      setStep('review');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao processar o extrato';
      setError(message);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (index: number, updates: Partial<ReviewRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  };

  const toggleAll = (checked: boolean) => {
    // Pagamentos de fatura nunca entram no "selecionar todos"
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: checked && row.kind !== 'PAGAMENTO_FATURA',
      }))
    );
  };

  const handleImport = async () => {
    if (!session?.access_token || selectedRows.length === 0) return;

    if (missingCategoryCount > 0) {
      setError(
        `${missingCategoryCount} transação(ões) selecionada(s) sem categoria. Defina a categoria ou desmarque-as.`
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
      const items: ConfirmImportItem[] = selectedRows.map((row) => ({
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
      }));

      const result = await financeApi.confirmImport(
        {
          account_id: targetType === 'account' ? targetId : undefined,
          credit_card_id: targetType === 'credit_card' ? targetId : undefined,
          items,
        },
        session.access_token
      );

      const parts = [`${result.transactions_created} transação(ões)`];
      if (result.transfers_created > 0) {
        parts.push(`${result.transfers_created} transferência(s)`);
      }
      toast.success(`Importação concluída: ${parts.join(' e ')}`);
      handleOpenChange(false);
      onImported();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao importar transações';
      setError(message);
    } finally {
      setImporting(false);
    }
  };

  const categoriesForType = (type: 'RECEITA' | 'DESPESA') =>
    categories.filter((c) => c.is_active && c.type === type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          step === 'review' ? 'sm:max-w-[980px]' : 'sm:max-w-[520px]'
        }
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Importar Extrato
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Envie o extrato da sua conta ou fatura do cartão e a IA cadastra as transações para você.'
              : 'Revise as transações identificadas pela IA antes de confirmar o cadastro.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Tipo de destino <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={targetType}
                  onValueChange={(value) => {
                    setTargetType(value as TargetType);
                    setTargetId('');
                  }}
                >
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Conta bancária</SelectItem>
                    <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {targetType === 'account' ? 'Conta' : 'Cartão'}{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetType === 'account'
                      ? activeAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))
                      : activeCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Arquivo do extrato <span className="text-red-500">*</span>
              </Label>

              {!file ? (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar o arquivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV, OFX, TXT, PDF ou imagem (máx. 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-blue-500" />
                  ) : (
                    <FileText className="h-8 w-8 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={parsing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={parsing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleParse}
                disabled={!file || !targetId || parsing}
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando com IA...
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
            {/* Resumo */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <strong>{selectedRows.length}</strong> de {rows.length} selecionada(s)
              </span>
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

            {/* Avisos de comportamento */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 space-y-1">
              <p className="flex items-start gap-1.5 text-[12px] text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {targetType === 'account'
                  ? 'As transações serão registradas como PAGAS (extrato é fato consumado) e o saldo da conta será atualizado. Transferências entre suas contas usam o fluxo nativo e ajustam os dois saldos.'
                  : 'As compras entram na fatura em aberto (pendentes) e baixam o limite disponível do cartão. A baixa acontece quando você pagar a fatura.'}
              </p>
              {invoicePaymentCount > 0 && (
                <p className="flex items-start gap-1.5 text-[12px] text-violet-700">
                  <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {invoicePaymentCount} linha(s) de pagamento de fatura vieram desmarcadas —
                  registre pela tela de cartões para não contar o gasto duas vezes (ou
                  reclassifique como Normal se preferir).
                </p>
              )}
            </div>

            {/* Tabela de revisão */}
            <div className="max-h-[420px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          rows.length > 0 &&
                          rows
                            .filter((r) => r.kind !== 'PAGAMENTO_FATURA')
                            .every((r) => r.selected)
                        }
                        onCheckedChange={(checked) => toggleAll(checked === true)}
                        aria-label="Selecionar todas"
                      />
                    </TableHead>
                    <TableHead className="w-24">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    {targetType === 'account' && (
                      <TableHead className="w-36">Tipo</TableHead>
                    )}
                    <TableHead className="w-48">Categoria</TableHead>
                    <TableHead className="w-28 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={index}
                      className={!row.selected ? 'opacity-50' : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          disabled={row.kind === 'PAGAMENTO_FATURA'}
                          onCheckedChange={(checked) =>
                            updateRow(index, { selected: checked === true })
                          }
                          aria-label="Selecionar transação"
                        />
                      </TableCell>
                      <TableCell className="text-[13px] whitespace-nowrap">
                        {formatDate(row.due_date)}
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
                        </div>
                        {row.notes && (
                          <p className="text-[11px] text-muted-foreground">
                            {row.notes}
                          </p>
                        )}
                      </TableCell>
                      {targetType === 'account' && (
                        <TableCell>
                          <Select
                            value={row.kind}
                            onValueChange={(value) =>
                              updateRow(index, {
                                kind: value as StatementLineKind,
                                // Sai de "pagamento de fatura" → pode selecionar
                                selected:
                                  value === 'PAGAMENTO_FATURA'
                                    ? false
                                    : row.selected,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(KIND_LABELS) as StatementLineKind[]
                              ).map((kind) => (
                                <SelectItem key={kind} value={kind}>
                                  {KIND_LABELS[kind]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {row.kind === 'TRANSFERENCIA_INTERNA' && (
                            <Select
                              value={row.transferAccountId || ''}
                              onValueChange={(value) =>
                                updateRow(index, { transferAccountId: value })
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
                                  .filter((account) => account.id !== targetId)
                                  .map((account) => (
                                    <SelectItem
                                      key={account.id}
                                      value={account.id}
                                    >
                                      {account.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Select
                          value={row.category_id || ''}
                          onValueChange={(value) =>
                            updateRow(index, { category_id: value })
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setRows([]);
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
                disabled={importing || selectedRows.length === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${selectedRows.length} transação(ões)`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
