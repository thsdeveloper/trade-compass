import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatCurrency,
  type BudgetAllocation,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
  BUDGET_STATUS_LABELS,
} from '@/types/finance';

interface BudgetProgressCardProps {
  allocation: BudgetAllocation;
  totalIncome: number;
  /** Quando presente, a linha vira um alvo de toque (drill-down do bucket). */
  onPress?: () => void;
}

export function BudgetProgressCard({
  allocation,
  totalIncome,
  onPress,
}: BudgetProgressCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const categoryColor = BUDGET_CATEGORY_COLORS[allocation.category];
  const idealAmount = totalIncome * (allocation.ideal_percentage / 100);
  const progressPercentage = Math.min(
    (allocation.actual_amount / idealAmount) * 100,
    100
  );

  const getStatusColors = () => {
    switch (allocation.status) {
      case 'on_track':
        return { text: colors.success, bg: colors.successLight };
      case 'over_budget':
        return { text: colors.danger, bg: colors.dangerLight };
      case 'under_budget':
        return { text: colors.info, bg: colors.infoLight };
    }
  };

  const statusColors = getStatusColors();

  return (
    <Pressable
      style={({ pressed }) => [styles.container, onPress && pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress ? `Ver gastos de ${allocation.label}` : undefined
      }
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: categoryColor + '22' }]}>
            <IconSymbol
              name={BUDGET_CATEGORY_ICONS[allocation.category]}
              size={15}
              color={categoryColor}
            />
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            {allocation.label}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
          >
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {BUDGET_STATUS_LABELS[allocation.status]}
            </Text>
          </View>
          {onPress && (
            <IconSymbol name="chevron.right" size={14} color={colors.icon} />
          )}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBackground,
            { backgroundColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: categoryColor,
                width: `${progressPercentage}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.valuesRow}>
        <View>
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Atual</Text>
          <Text style={[styles.valueAmount, { color: colors.text }]}>
            {formatCurrency(allocation.actual_amount)}
          </Text>
        </View>
        <View style={styles.idealContainer}>
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
            Ideal ({allocation.ideal_percentage}%)
          </Text>
          <Text style={[styles.valueAmount, { color: colors.textSecondary }]}>
            {formatCurrency(idealAmount)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idealContainer: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
