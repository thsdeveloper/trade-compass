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
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
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
          { backgroundColor: colors.surface },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
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
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
        <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
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
            tintColor={colors.primary}
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
    fontSize: FontSize['3xl'],
    fontWeight: 'bold',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
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
    fontSize: FontSize.md,
  },
  errorContainer: {
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    textAlign: 'center',
  },
});
