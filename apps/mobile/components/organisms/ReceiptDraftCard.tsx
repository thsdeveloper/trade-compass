import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Button } from '@/components/atoms/Button';
import type { TransactionDraft } from '@/types/agent';
import type { FinanceCategory } from '@/types/finance';
import { formatCurrency, formatFullDate } from '@/types/finance';

interface ReceiptDraftCardProps {
  draft: TransactionDraft;
  categories: FinanceCategory[];
  onReview: () => void;
}

/**
 * Resumo do que a Nota leu na nota/comprovante. Não lança nada: o botão abre a
 * tela de Nova Transação já preenchida, onde o usuário revisa, ajusta e confirma.
 */
export function ReceiptDraftCard({ draft, categories, onReview }: ReceiptDraftCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isExpense = draft.type === 'DESPESA';

  const category = useMemo(
    () => categories.find((c) => c.id === draft.category_id) ?? null,
    [categories, draft.category_id]
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Cabeçalho: tipo */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isExpense ? '#EF444422' : '#10B98122' },
          ]}
        >
          <Text style={[styles.typeBadgeText, { color: isExpense ? '#EF4444' : '#10B981' }]}>
            {isExpense ? 'Despesa' : 'Receita'}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.text }]}>{draft.description}</Text>

      <Text style={[styles.amount, { color: colors.text }]}>
        {draft.amount !== null ? formatCurrency(draft.amount) : 'Valor a definir'}
      </Text>

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

      <Button
        label="Revisar e lançar"
        onPress={onReview}
        variant="primary"
        icon="arrow-forward"
        accessibilityLabel="Revisar e lançar a transação"
        style={styles.reviewButton}
      />
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
  description: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  amount: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
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
  reviewButton: {
    marginTop: Spacing.xs,
  },
});
