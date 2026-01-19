import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
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
  const isDark = colorScheme === 'dark';

  const typeColor = getTypeColor(transaction.type);
  const statusColor = getStatusColor(transaction.status);
  const statusBgColor = getStatusBackgroundColor(transaction.status);

  const amountPrefix = transaction.type === 'RECEITA' ? '+' : '-';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1f2937' : '#fff' },
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
          <Text style={[styles.accountText, { color: colors.icon }]}>
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
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
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
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  accountText: {
    fontSize: 12,
    marginTop: 4,
  },
});
