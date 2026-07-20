import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { getCategoryIcon } from '@/lib/category-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
  formatCurrency,
  type BudgetBreakdown,
  type BudgetBreakdownBucket,
  type BudgetBreakdownCategory,
} from '@/types/finance';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type BudgetBreakdownSectionProps = {
  breakdown: BudgetBreakdown | null;
  loading?: boolean;
};

function formatShortDate(dueDate: string): string {
  const [y, m, d] = dueDate.split('-').map(Number);
  if (!y || !m || !d) return dueDate;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Detalhamento dos gastos por bucket 50-30-20: cada bucket abre mostrando
 * as categorias que o compõem (valor + nº de lançamentos) e cada categoria
 * abre revelando as transações. Consome /finance/dashboard/budget-breakdown.
 */
export function BudgetBreakdownSection({
  breakdown,
  loading,
}: BudgetBreakdownSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [openBuckets, setOpenBuckets] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const cardBorder = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      colorScheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
  } as const;

  const activeBuckets = (breakdown?.buckets ?? []).filter(
    (b) => b.categories.length > 0
  );

  return (
    <GlassSurface variant="material" style={[styles.card, cardBorder]}>
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
        Gastos por categoria
      </Text>

      {loading && !breakdown ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Carregando…
        </Text>
      ) : activeBuckets.length === 0 ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Nenhum gasto registrado neste mês.
        </Text>
      ) : (
        activeBuckets.map((bucket) => (
          <BucketRow
            key={bucket.category}
            bucket={bucket}
            open={openBuckets.has(bucket.category)}
            openCategories={openCategories}
            colors={colors}
            onToggle={() => setOpenBuckets((s) => toggle(s, bucket.category))}
            onToggleCategory={(id) =>
              setOpenCategories((s) => toggle(s, id))
            }
          />
        ))
      )}
    </GlassSurface>
  );
}

type ThemeColors = (typeof Colors)['light'];

function BucketRow({
  bucket,
  open,
  openCategories,
  colors,
  onToggle,
  onToggleCategory,
}: {
  bucket: BudgetBreakdownBucket;
  open: boolean;
  openCategories: Set<string>;
  colors: ThemeColors;
  onToggle: () => void;
  onToggleCategory: (id: string) => void;
}) {
  const bucketColor = BUDGET_CATEGORY_COLORS[bucket.category];

  return (
    <View style={styles.bucket}>
      <Pressable style={styles.bucketHeader} onPress={onToggle}>
        <View style={[styles.bucketIcon, { backgroundColor: bucketColor + '22' }]}>
          <IconSymbol
            name={BUDGET_CATEGORY_ICONS[bucket.category]}
            size={15}
            color={bucketColor}
          />
        </View>
        <Text style={[styles.bucketLabel, { color: colors.text }]}>
          {bucket.label}
        </Text>
        <Text style={[styles.bucketTotal, { color: colors.text }]}>
          {formatCurrency(bucket.total)}
        </Text>
        <IconSymbol
          name={open ? 'chevron.up' : 'chevron.down'}
          size={14}
          color={colors.textSecondary}
        />
      </Pressable>

      {open &&
        bucket.categories.map((cat) => (
          <CategoryRow
            key={cat.category_id}
            category={cat}
            open={openCategories.has(cat.category_id)}
            colors={colors}
            onToggle={() => onToggleCategory(cat.category_id)}
          />
        ))}
    </View>
  );
}

function CategoryRow({
  category,
  open,
  colors,
  onToggle,
}: {
  category: BudgetBreakdownCategory;
  open: boolean;
  colors: ThemeColors;
  onToggle: () => void;
}) {
  return (
    <View>
      <Pressable style={styles.categoryRow} onPress={onToggle}>
        <View
          style={[styles.categoryIcon, { backgroundColor: category.color + '22' }]}
        >
          <IconSymbol
            name={getCategoryIcon(category.icon)}
            size={15}
            color={category.color}
          />
        </View>
        <View style={styles.categoryBody}>
          <Text
            style={[styles.categoryName, { color: colors.text }]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
          <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
            {category.count} {category.count === 1 ? 'lançamento' : 'lançamentos'}
          </Text>
        </View>
        <Text style={[styles.categoryAmount, { color: colors.text }]}>
          {formatCurrency(category.amount)}
        </Text>
        <IconSymbol
          name={open ? 'chevron.up' : 'chevron.down'}
          size={12}
          color={colors.textSecondary}
        />
      </Pressable>

      {open &&
        category.transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            {tx.is_credit_card ? (
              <IconSymbol name="creditcard" size={12} color={colors.textSecondary} />
            ) : (
              <View style={[styles.txDot, { backgroundColor: colors.textSecondary }]} />
            )}
            <Text
              style={[styles.txDescription, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {tx.description}
            </Text>
            {tx.status === 'PENDENTE' && (
              <View style={[styles.pendingPill, { backgroundColor: colors.warningLight }]}>
                <Text style={[styles.pendingText, { color: colors.warning }]}>
                  Pendente
                </Text>
              </View>
            )}
            <Text style={[styles.txDate, { color: colors.textSecondary }]}>
              {formatShortDate(tx.due_date)}
            </Text>
            <Text style={[styles.txAmount, { color: colors.text }]}>
              {formatCurrency(tx.amount)}
            </Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.sm,
    paddingVertical: Spacing.sm,
  },
  bucket: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.18)',
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  bucketIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  bucketTotal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSize.md,
  },
  categoryCount: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  categoryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    paddingLeft: Spacing['3xl'],
  },
  txDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
  },
  txDescription: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  txDate: {
    fontSize: FontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  txAmount: {
    fontSize: FontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  pendingPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
});
