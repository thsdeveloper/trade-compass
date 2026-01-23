import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatCurrency,
  type BudgetAllocation,
  BUDGET_CATEGORY_COLORS,
  BUDGET_STATUS_LABELS,
} from '@/types/finance';

interface BudgetProgressCardProps {
  allocation: BudgetAllocation;
  totalIncome: number;
}

export function BudgetProgressCard({
  allocation,
  totalIncome,
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.colorDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.label, { color: colors.text }]}>
            {allocation.label}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
        >
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {BUDGET_STATUS_LABELS[allocation.status]}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
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
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
