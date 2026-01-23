import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TransactionWithDetails } from '@/types/finance';
import {
  formatCurrency,
  getTypeColor,
  getStatusColor,
  getStatusBackgroundColor,
  TRANSACTION_STATUS_LABELS,
} from '@/types/finance';

interface TransactionListItemProps {
  transaction: TransactionWithDetails;
}

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const typeColor = getTypeColor(transaction.type);
  const statusColor = getStatusColor(transaction.status);
  const statusBgColor = getStatusBackgroundColor(transaction.status);

  const amountPrefix = transaction.type === 'RECEITA' ? '+' : '-';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card },
      ]}
    >
      <View style={[styles.colorIndicator, { backgroundColor: transaction.category.color }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={[styles.amount, { color: typeColor }]}>
            {amountPrefix} {formatCurrency(transaction.amount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.categoryContainer}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: transaction.category.color + '20' },
              ]}
            >
              <Text
                style={[styles.categoryText, { color: transaction.category.color }]}
                numberOfLines={1}
              >
                {transaction.category.name}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {TRANSACTION_STATUS_LABELS[transaction.status]}
            </Text>
          </View>
        </View>

        {transaction.account && (
          <Text style={[styles.accountText, { color: colors.textSecondary }]}>
            {transaction.account.name}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  accountText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
