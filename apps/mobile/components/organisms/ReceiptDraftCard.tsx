import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { BankLogo } from '@/components/atoms/BankLogo';
import { Button } from '@/components/atoms/Button';
import type { TransactionDraft } from '@/types/agent';
import type { FinanceAccount, FinanceCategory, FinanceCreditCard } from '@/types/finance';
import { formatCurrency, formatFullDate } from '@/types/finance';

export interface DraftConfirmation {
  accountId?: string;
  creditCardId?: string;
  amount: number;
  categoryId: string;
}

interface ReceiptDraftCardProps {
  draft: TransactionDraft;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  creditCards: FinanceCreditCard[];
  saved: boolean;
  onConfirm: (data: DraftConfirmation) => Promise<void>;
}

type PaymentSource =
  | { kind: 'account'; id: string }
  | { kind: 'card'; id: string };

/**
 * Cartão de rascunho da transação extraída pelo agente: mostra os dados
 * interpretados e pede só o que falta (conta/cartão e campos ausentes).
 */
export function ReceiptDraftCard({
  draft,
  categories,
  accounts,
  creditCards,
  saved,
  onConfirm,
}: ReceiptDraftCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [source, setSource] = useState<PaymentSource | null>(null);
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(draft.category_id);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpense = draft.type === 'DESPESA';

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const typeCategories = useMemo(
    () => categories.filter((c) => c.type === draft.type),
    [categories, draft.type]
  );

  const amount = useMemo(() => {
    if (draft.amount !== null) return draft.amount;
    const parsed = parseFloat(amountText.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [draft.amount, amountText]);

  // RECEITA entra em conta; cartão de crédito só para despesas
  const showCards = isExpense && creditCards.length > 0;
  const canConfirm =
    !saved && !isSaving && source !== null && amount !== null && categoryId !== null;

  const handleConfirm = async () => {
    if (!canConfirm || !source || amount === null || !categoryId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setIsSaving(true);
    try {
      await onConfirm({
        accountId: source.kind === 'account' ? source.id : undefined,
        creditCardId: source.kind === 'card' ? source.id : undefined,
        amount,
        categoryId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transacao');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Cabeçalho: tipo + valor */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isExpense ? '#EF444422' : '#10B98122' },
          ]}
        >
          <Text
            style={[styles.typeBadgeText, { color: isExpense ? '#EF4444' : '#10B981' }]}
          >
            {isExpense ? 'Despesa' : 'Receita'}
          </Text>
        </View>
        {saved && (
          <View style={styles.savedBadge}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#10B981" />
            <Text style={styles.savedText}>Salva</Text>
          </View>
        )}
      </View>

      <Text style={[styles.description, { color: colors.text }]}>{draft.description}</Text>

      {draft.amount !== null ? (
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(draft.amount)}
        </Text>
      ) : (
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Valor</Text>
          <TextInput
            style={[
              styles.amountInput,
              { backgroundColor: colors.background, color: colors.text },
            ]}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0,00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            editable={!saved}
          />
        </View>
      )}

      <View style={styles.metaRow}>
        {draft.due_date && (
          <View style={styles.metaItem}>
            <IconSymbol name="calendar" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatFullDate(draft.due_date)}
            </Text>
          </View>
        )}
        {category && (
          <View style={styles.metaItem}>
            <IconSymbol name="tag" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Categoria ausente: chips para escolher */}
      {!saved && categoryId === null && typeCategories.length > 0 && (
        <View style={styles.selectorBlock}>
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
            Qual categoria?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {typeCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Seleção de conta/cartão */}
      {!saved && (
        <View style={styles.selectorBlock}>
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
            {isExpense ? 'Pagou com qual conta ou cartão?' : 'Recebeu em qual conta?'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {accounts.map((account) => {
                const selected = source?.kind === 'account' && source.id === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setSource({ kind: 'account', id: account.id })}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? `${colors.primary}22` : colors.background,
                      },
                    ]}
                  >
                    <BankLogo
                      bank={account.bank_id}
                      name={account.name}
                      size={16}
                      formato="circulo"
                      fallback={
                        <IconSymbol
                          name="building.columns"
                          size={14}
                          color={selected ? colors.primary : colors.textSecondary}
                        />
                      }
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {account.name}
                    </Text>
                  </Pressable>
                );
              })}
              {showCards &&
                creditCards.map((card) => {
                  const selected = source?.kind === 'card' && source.id === card.id;
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => setSource({ kind: 'card', id: card.id })}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected
                            ? `${colors.primary}22`
                            : colors.background,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="creditcard"
                        size={14}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.primary : colors.text },
                        ]}
                      >
                        {card.name}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          </ScrollView>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!saved && (
        <Button
          label="Confirmar lançamento"
          onPress={handleConfirm}
          variant="primary"
          icon="checkmark"
          loading={isSaving}
          disabled={!canConfirm}
          accessibilityLabel="Confirmar e salvar transacao"
          style={styles.confirmButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  savedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#10B981',
  },
  description: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  amount: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },
  fieldRow: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  amountInput: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.lg,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
  },
  selectorBlock: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  selectorLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: '#EF4444',
  },
  confirmButton: {
    marginTop: Spacing.xs,
  },
});
