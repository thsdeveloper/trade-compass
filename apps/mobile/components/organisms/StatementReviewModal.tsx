import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { MoneyText } from '@/components/atoms/MoneyText';
import { Button } from '@/components/atoms/Button';
import { CategoryPicker } from '@/components/organisms/CategoryPicker';
import { AccountPicker } from '@/components/organisms/AccountPicker';
import { getCategoryIcon } from '@/lib/category-icons';
import { confirmImport } from '@/lib/finance-api';
import { formatStatementDate } from '@/lib/statement-file';
import { formatCurrency } from '@/types/finance';
import type { FinanceAccount, FinanceCategory } from '@/types/finance';
import type {
  ConfirmImportItem,
  ConfirmImportResult,
  ImportPreviewTransaction,
  ImportTarget,
  InvoiceAdjustment,
  ReviewRow,
} from '@/types/import';

const NOTA_ACCENT = '#14B8A6';
const MAX_BATCH_ITEMS = 500; // teto do backend (import.ts)

/**
 * Chave de similaridade entre descrições: minúsculas, sem acentos, sem
 * números (datas, ids, parcelas) e sem pontuação. "PIX Uber 12/07" e
 * "PIX UBER 15/07" caem na mesma chave — base da propagação de categoria.
 */
function similarityKey(description: string): string {
  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface StatementReviewModalProps {
  visible: boolean;
  fileName: string;
  target: ImportTarget;
  targetLabel: string;
  transactions: ImportPreviewTransaction[];
  /** Transações do arquivo que ficaram de fora por já terem sido importadas */
  alreadyImportedCount?: number;
  /** Saldo "fatura anterior e pagamentos" da fatura (negativo = crédito) */
  invoiceAdjustment?: InvoiceAdjustment | null;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  /** Fecha sem confirmar (a revisão fica pendente no chat) */
  onClose: () => void;
  onCommitted: (result: ConfirmImportResult, includedCount: number) => void;
}

interface RowItemProps {
  row: ReviewRow;
  isCardTarget: boolean;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  onUpdate: (id: string, updates: Partial<ReviewRow>) => void;
  /** Seleção de categoria passa por aqui para propagar aos itens similares */
  onCategorySelect: (id: string, category: FinanceCategory) => void;
}

const ReviewRowItem = memo(function ReviewRowItem({
  row,
  isCardTarget,
  categories,
  accounts,
  onUpdate,
  onCategorySelect,
}: RowItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isInvoicePayment = row.kind === 'PAGAMENTO_FATURA';
  const isTransfer = row.kind === 'TRANSFERENCIA_INTERNA';
  const rowCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.type === row.type),
    [categories, row.type]
  );

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => onUpdate(row.id, { selected: !row.selected })}
        disabled={isInvoicePayment}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.selected, disabled: isInvoicePayment }}
        style={styles.checkboxHit}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            row.selected && styles.checkboxOn,
            isInvoicePayment && styles.checkboxDisabled,
          ]}
        >
          {row.selected && <IconSymbol name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </Pressable>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.description, { color: colors.text }]}
            numberOfLines={2}
          >
            {row.description}
          </Text>
          <MoneyText value={row.amount} type={row.type} style={styles.amount} />
        </View>

        <View style={styles.badgeRow}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatStatementDate(row.due_date)}
          </Text>
          {isTransfer && (
            <View style={[styles.badge, styles.badgeTransfer]}>
              <Text style={styles.badgeTransferText}>Transferência</Text>
            </View>
          )}
          {isInvoicePayment && (
            <View style={[styles.badge, styles.badgeInvoice]}>
              <Text style={styles.badgeInvoiceText}>Pgto fatura</Text>
            </View>
          )}
          {row.duplicate_exact ? (
            <View style={[styles.badge, styles.badgeImported]}>
              <Text style={styles.badgeImportedText}>Já importada</Text>
            </View>
          ) : (
            row.possible_duplicate && (
              <View style={[styles.badge, styles.badgeDuplicate]}>
                <Text style={styles.badgeDuplicateText}>Duplicata?</Text>
              </View>
            )
          )}
        </View>

        <View style={styles.chipRow}>
          {/* Categoria é obrigatória em toda linha selecionada, inclusive
              transferência (o backend exige category_id no item) */}
          <CategoryPicker
            categories={rowCategories}
            selectedId={row.category_id}
            onSelect={(category) => onCategorySelect(row.id, category)}
            renderTrigger={({ open, selected }) => (
              <Pressable
                onPress={open}
                style={[styles.chip, { backgroundColor: colors.card }]}
              >
                {selected ? (
                  <IconSymbol
                    name={getCategoryIcon(selected.icon)}
                    size={14}
                    color={selected.color}
                  />
                ) : (
                  <IconSymbol name="tag" size={14} color={colors.danger} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.text : colors.danger },
                  ]}
                  numberOfLines={1}
                >
                  {selected ? selected.name : 'Categoria…'}
                </Text>
              </Pressable>
            )}
          />
          {!isCardTarget && isTransfer && (
            <AccountPicker
              accounts={accounts}
              selectedId={row.transferAccountId}
              onSelect={(account) =>
                onUpdate(row.id, { transferAccountId: account.id })
              }
              renderTrigger={({ open, selected }) => (
                <Pressable
                  onPress={open}
                  style={[styles.chip, { backgroundColor: colors.card }]}
                >
                  <IconSymbol
                    name="arrow.up.arrow.down"
                    size={14}
                    color={selected ? NOTA_ACCENT : colors.danger}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.text : colors.danger },
                    ]}
                    numberOfLines={1}
                  >
                    {selected
                      ? selected.name
                      : row.type === 'DESPESA'
                        ? 'Para qual conta?'
                        : 'De qual conta?'}
                  </Text>
                </Pressable>
              )}
            />
          )}
          {!isCardTarget && (isTransfer || isInvoicePayment) && (
            <Pressable
              onPress={() => onUpdate(row.id, { kind: 'NORMAL' })}
              style={styles.inlineAction}
            >
              <Text style={[styles.inlineActionText, { color: NOTA_ACCENT }]}>
                Tratar como normal
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

/**
 * Revisão editável da importação de extrato (Atomic Design · organismo).
 * Modal full-screen com FlatList própria — o parse pode devolver centenas de
 * linhas, o que inviabiliza um card dentro da FlatList do chat.
 */
export function StatementReviewModal({
  visible,
  fileName,
  target,
  targetLabel,
  transactions,
  alreadyImportedCount = 0,
  invoiceAdjustment = null,
  categories,
  accounts,
  onClose,
  onCommitted,
}: StatementReviewModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const isCardTarget = !!target.credit_card_id;

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicatas e pagamentos de fatura começam desmarcados (mesma regra da web):
  // duplicata evita cadastro duplo; pagamento de fatura contaria o gasto do
  // cartão duas vezes.
  useEffect(() => {
    setRows(
      transactions.map((tx, index) => ({
        ...tx,
        id: String(index),
        selected: !tx.possible_duplicate && tx.line_kind !== 'PAGAMENTO_FATURA',
        kind: tx.line_kind,
        transferAccountId: tx.suggested_transfer_account_id,
      }))
    );
    setError(null);
  }, [transactions]);

  const counterpartAccounts = useMemo(
    () => accounts.filter((a) => a.is_active && a.id !== target.account_id),
    [accounts, target.account_id]
  );

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const totals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const row of selectedRows) {
      if (row.type === 'RECEITA') receitas += row.amount;
      else despesas += row.amount;
    }
    return { receitas, despesas };
  }, [selectedRows]);

  const duplicateCount = useMemo(
    () => rows.filter((r) => r.possible_duplicate).length,
    [rows]
  );
  const invoicePaymentCount = useMemo(
    () => rows.filter((r) => r.kind === 'PAGAMENTO_FATURA').length,
    [rows]
  );

  const updateRow = useCallback((id: string, updates: Partial<ReviewRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }, []);

  // Aviso transitório de propagação ("aplicada a mais N parecidas")
  const [bulkHint, setBulkHint] = useState<string | null>(null);
  const bulkHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (bulkHintTimer.current) clearTimeout(bulkHintTimer.current);
    },
    []
  );

  /**
   * Escolher a categoria de um item também categoriza os itens PARECIDOS que
   * ainda estão sem categoria (mesma chave de similaridade e mesmo tipo) —
   * ex: 12 corridas de Uber em datas diferentes viram 1 toque em vez de 12.
   * Nunca sobrescreve categoria já definida (pela IA ou pelo usuário).
   */
  const handleCategorySelect = useCallback(
    (rowId: string, category: FinanceCategory) => {
      const targetRow = rows.find((r) => r.id === rowId);
      if (!targetRow) return;

      const key = similarityKey(targetRow.description);
      let propagated = 0;

      setRows((prev) =>
        prev.map((row) => {
          if (row.id === rowId) return { ...row, category_id: category.id };
          if (
            key &&
            !row.category_id &&
            row.type === targetRow.type &&
            similarityKey(row.description) === key
          ) {
            propagated++;
            return { ...row, category_id: category.id };
          }
          return row;
        })
      );

      if (propagated > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBulkHint(
          `"${category.name}" aplicada a mais ${propagated} transaç${propagated === 1 ? 'ão parecida' : 'ões parecidas'}.`
        );
        if (bulkHintTimer.current) clearTimeout(bulkHintTimer.current);
        bulkHintTimer.current = setTimeout(() => setBulkHint(null), 4000);
      }
    },
    [rows]
  );

  const handleImport = useCallback(async () => {
    if (importing || selectedRows.length === 0) return;

    const missingCategory = selectedRows.filter((r) => !r.category_id).length;
    if (missingCategory > 0) {
      setError(
        `${missingCategory} transação(ões) selecionada(s) sem categoria. Defina a categoria ou desmarque-as.`
      );
      return;
    }

    const missingTransferAccount = selectedRows.filter(
      (r) => r.kind === 'TRANSFERENCIA_INTERNA' && !r.transferAccountId
    ).length;
    if (missingTransferAccount > 0) {
      setError(
        `${missingTransferAccount} transferência(s) sem conta de contrapartida. Escolha a conta ou desmarque-as.`
      );
      return;
    }

    if (selectedRows.length > MAX_BATCH_ITEMS) {
      setError(
        `Máximo de ${MAX_BATCH_ITEMS} transações por importação. Desmarque algumas e importe o restante depois.`
      );
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const items: ConfirmImportItem[] = selectedRows.map((row) => ({
        kind:
          row.kind === 'TRANSFERENCIA_INTERNA' && !isCardTarget
            ? 'TRANSFERENCIA_INTERNA'
            : 'NORMAL',
        category_id: row.category_id!,
        type: row.type,
        description: row.description,
        amount: row.amount,
        due_date: row.due_date,
        notes: row.notes || undefined,
        transfer_account_id:
          row.kind === 'TRANSFERENCIA_INTERNA' && !isCardTarget
            ? (row.transferAccountId ?? undefined)
            : undefined,
        fitid: row.fitid ?? undefined,
      }));

      const result = await confirmImport(
        target,
        items,
        isCardTarget && invoiceAdjustment ? invoiceAdjustment : undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCommitted(result, items.length);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao importar as transações';
      setError(message);
    } finally {
      setImporting(false);
    }
  }, [importing, selectedRows, isCardTarget, target, invoiceAdjustment, onCommitted]);

  const renderItem = useCallback(
    ({ item }: { item: ReviewRow }) => (
      <ReviewRowItem
        row={item}
        isCardTarget={isCardTarget}
        categories={categories}
        accounts={counterpartAccounts}
        onUpdate={updateRow}
        onCategorySelect={handleCategorySelect}
      />
    ),
    [isCardTarget, categories, counterpartAccounts, updateRow, handleCategorySelect]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              Revisar importação
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {targetLabel} · {fileName}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Fechar revisão"
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.summaryBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {selectedRows.length} de {rows.length} selecionada(s)
            {' · Receitas '}
            <Text style={{ color: colors.success }}>
              {formatCurrency(totals.receitas)}
            </Text>
            {' · Despesas '}
            {formatCurrency(totals.despesas)}
          </Text>
          {alreadyImportedCount > 0 && (
            <View style={styles.importedNotice}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
              <Text style={[styles.summaryHint, styles.importedNoticeText, { color: colors.textSecondary }]}>
                {alreadyImportedCount === 1
                  ? '1 transação deste arquivo já foi importada antes e não aparece aqui.'
                  : `${alreadyImportedCount} transações deste arquivo já foram importadas antes e não aparecem aqui.`}
              </Text>
            </View>
          )}
          {duplicateCount > 0 && (
            <Text style={[styles.summaryHint, { color: colors.warning }]}>
              {duplicateCount} possível(is) duplicata(s) desmarcada(s) — confira antes
              de marcar.
            </Text>
          )}
          {invoicePaymentCount > 0 && (
            <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
              Pagamentos de fatura ficam de fora para não contar o gasto do cartão
              duas vezes. Use &quot;Tratar como normal&quot; se quiser importá-los.
            </Text>
          )}
          {isCardTarget && invoiceAdjustment && (
            <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
              {invoiceAdjustment.amount < 0
                ? `Crédito de ${formatCurrency(Math.abs(invoiceAdjustment.amount))} da fatura anterior será abatido automaticamente do valor da fatura.`
                : `Saldo devedor de ${formatCurrency(invoiceAdjustment.amount)} da fatura anterior será somado automaticamente ao valor da fatura.`}
            </Text>
          )}
          {bulkHint && (
            <Text style={[styles.summaryHint, { color: NOTA_ACCENT }]}>{bulkHint}</Text>
          )}
        </View>

        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          windowSize={9}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          removeClippedSubviews
        />

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}
        >
          <Button
            label={
              selectedRows.length === 1
                ? 'Importar 1 transação'
                : `Importar ${selectedRows.length} transações`
            }
            size="lg"
            fullWidth
            loading={importing}
            disabled={importing || selectedRows.length === 0}
            onPress={handleImport}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  subtitle: {
    fontSize: FontSize.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  summaryBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  summaryHint: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  importedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  importedNoticeText: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkboxHit: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: NOTA_ACCENT,
    borderColor: NOTA_ACCENT,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  description: {
    flex: 1,
    fontSize: FontSize.md,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: FontSize.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeTransfer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  badgeTransferText: {
    fontSize: FontSize.xs,
    color: '#3B82F6',
    fontWeight: FontWeight.medium,
  },
  badgeInvoice: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  badgeInvoiceText: {
    fontSize: FontSize.xs,
    color: '#A855F7',
    fontWeight: FontWeight.medium,
  },
  badgeDuplicate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeDuplicateText: {
    fontSize: FontSize.xs,
    color: '#D97706',
    fontWeight: FontWeight.medium,
  },
  badgeImported: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
  },
  badgeImportedText: {
    fontSize: FontSize.xs,
    color: '#E53935',
    fontWeight: FontWeight.medium,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    maxWidth: 220,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
  inlineAction: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  inlineActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
