import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Button } from '@/components/atoms/Button';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_DESCRIPTIONS,
  BUDGET_CATEGORY_ICONS,
  BUDGET_CATEGORY_IDEALS,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from '@/types/finance';

const BUCKETS: BudgetCategory[] = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];

type BudgetInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Bottom sheet (estilo Revolut) que explica as categorias do orçamento
 * 50-30-20: uma linha por bucket com o ícone oficial, o percentual ideal e
 * uma explicação curta, fechando com o CTA "Entendi".
 */
export function BudgetInfoSheet({ visible, onClose }: BudgetInfoSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <BottomSheet visible={visible} title="Como funciona o orçamento" onClose={onClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Seus gastos são organizados na regra 50-30-20: metade da renda para o
          essencial, 30% para o seu estilo de vida e 20% para o futuro.
        </Text>

        {BUCKETS.map((bucket) => (
          <View key={bucket} style={styles.row}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: BUDGET_CATEGORY_COLORS[bucket] + '22' },
              ]}
            >
              <IconSymbol
                name={BUDGET_CATEGORY_ICONS[bucket]}
                size={20}
                color={BUDGET_CATEGORY_COLORS[bucket]}
              />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {BUDGET_CATEGORY_LABELS[bucket]}
                <Text style={{ color: colors.textSecondary }}>
                  {'  ·  '}
                  {BUDGET_CATEGORY_IDEALS[bucket]}% da renda
                </Text>
              </Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                {BUDGET_CATEGORY_DESCRIPTIONS[bucket]}
              </Text>
            </View>
          </View>
        ))}

        <Button label="Entendi" onPress={onClose} style={styles.cta} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },
  intro: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  rowDescription: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
