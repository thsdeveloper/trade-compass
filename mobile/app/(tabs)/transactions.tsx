import { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { TransactionListItem } from '@/components/finance/TransactionListItem';
import {
  groupTransactionsByDate,
  formatFullDate,
  type TransactionWithDetails,
} from '@/types/finance';

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const {
    transactions,
    selectedMonth,
    isLoading,
    error,
    setSelectedMonth,
    loadTransactions,
    refreshAll,
  } = useFinance();

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth, loadTransactions]);

  const handlePreviousMonth = useCallback(() => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    );
  }, [selectedMonth, setSelectedMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    );
  }, [selectedMonth, setSelectedMonth]);

  const sections: SectionData[] = useMemo(() => {
    const grouped = groupTransactionsByDate(transactions);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        title: formatFullDate(date),
        data: items,
      }));
  }, [transactions]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: isDark ? colors.background : '#f3f4f6' },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors, isDark]
  );

  const renderItem = useCallback(
    ({ item }: { item: TransactionWithDetails }) => (
      <TransactionListItem transaction={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: TransactionWithDetails) => item.id,
    []
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.tint} />
        ) : (
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Nenhuma transacao neste mes
          </Text>
        )}
      </View>
    ),
    [isLoading, colors]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Transacoes</Text>

      <MonthNavigator
        date={selectedMonth}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadTransactions}
            tintColor={colors.tint}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
});
