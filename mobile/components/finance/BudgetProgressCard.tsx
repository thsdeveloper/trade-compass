import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
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
  const isDark = colorScheme === 'dark';

  const categoryColor = BUDGET_CATEGORY_COLORS[allocation.category];
  const idealAmount = totalIncome * (allocation.ideal_percentage / 100);
  const progressPercentage = Math.min(
    (allocation.actual_amount / idealAmount) * 100,
    100
  );

  const getStatusColor = () => {
    switch (allocation.status) {
      case 'on_track':
        return isDark ? '#10b981' : '#059669';
      case 'over_budget':
        return isDark ? '#f87171' : '#dc2626';
      case 'under_budget':
        return isDark ? '#60a5fa' : '#3b82f6';
    }
  };

  const getStatusBgColor = () => {
    switch (allocation.status) {
      case 'on_track':
        return isDark ? '#064e3b' : '#d1fae5';
      case 'over_budget':
        return isDark ? '#7f1d1d' : '#fee2e2';
      case 'under_budget':
        return isDark ? '#1e3a5f' : '#dbeafe';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1f2937' : '#fff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
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
          style={[styles.statusBadge, { backgroundColor: getStatusBgColor() }]}
        >
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {BUDGET_STATUS_LABELS[allocation.status]}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBackground,
            { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
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
          <Text style={[styles.valueLabel, { color: colors.icon }]}>Atual</Text>
          <Text style={[styles.valueAmount, { color: colors.text }]}>
            {formatCurrency(allocation.actual_amount)}
          </Text>
        </View>
        <View style={styles.idealContainer}>
          <Text style={[styles.valueLabel, { color: colors.icon }]}>
            Ideal ({allocation.ideal_percentage}%)
          </Text>
          <Text style={[styles.valueAmount, { color: colors.icon }]}>
            {formatCurrency(idealAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
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
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
